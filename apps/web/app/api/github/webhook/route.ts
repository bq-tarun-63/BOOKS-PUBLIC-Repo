import { NextRequest, NextResponse } from "next/server";
import { GitHubAppService } from "@/services/githubAppService";
import { GitHubIntegrationService } from "@/services/githubIntegrationService";
import { DatabaseService } from "@/services/databaseService";
import type { InstallationSummary } from "@/models/types/GitHubConnection";
import clientPromise from "@/lib/mongoDb/mongodb";
import { ObjectId } from "mongodb";
import type { INote } from "@/models/types/Note";
import type { IDatabaseSource } from "@/models/types/VeiwDatabase";
import { io } from "socket.io-client";

import { io as ClientIO, Socket } from "socket.io-client";

async function emitNoteUpdatedEvent(noteId: string, dataSourceId: string) {
  try {
    const socketServerUrl =
      process.env.SOCKET_SERVER_URL || "https://socket-server-8.onrender.com"; // <-- fix typo here
    const socketPath = process.env.SOCKET_SERVER_PATH || "/socket.io"; // set to '/socket.io-notifications' if needed
    console.log("[GitHub Webhook] Using socketServerUrl:", socketServerUrl, "path:", socketPath);

      await new Promise<void>((resolve) => {
        let settled = false;
        let absoluteTimeout: ReturnType<typeof setTimeout> | null = null;
        const settle = (msg?: string) => {
          if (!settled) {
            settled = true;
            if (absoluteTimeout) {
              clearTimeout(absoluteTimeout);
              absoluteTimeout = null;
            }
            console.log("[GitHub Webhook] settle:", msg || "done");
            resolve();
          }
        };

      // Longer connection timeout and allow reconnection for a short period
      const socket = ClientIO(socketServerUrl, {
        path: socketPath,
        // do NOT force websocket only — allow polling then upgrade
        transports: ["polling", "websocket"],
        reconnection: true,
        reconnectionAttempts: 3,
        reconnectionDelay: 500,
        timeout: 10000, // 10s connect timeout
        // if your server uses self-signed certs in dev:
        // extraHeaders: { "X-My-Header": "..." },
      });

      const cleanup = (reason?: string) => {
        socket.off("connect", handleConnect);
        socket.off("connect_error", handleError);
        socket.off("reconnect_attempt", handleReconnectAttempt);
        socket.off("reconnect_failed", handleReconnectFailed);

        try {
          if (socket && (socket as Socket).connected) {
            socket.disconnect();
          } else {
            socket.close();
          }
        } catch (e) {
          // ignore
        }
        settle(reason);
      };

      const handleConnect = () => {
        console.log("[GitHub Webhook] Socket connected:", socket.id);
        try {
          const payload = { noteId, dataSourceId };
          console.log("--------------------------------------------------------");
          socket.emit("note-updated", payload);
          console.log("[GitHub Webhook] Emitted note-updated", { noteId, dataSourceId });
        } catch (e) {
          console.warn("[GitHub Webhook] emit failed:", e);
        }
        // allow some time for socket to send before cleanup
        setTimeout(() => cleanup("sent"), 2500);
      };

      const handleError = (err: any) => {
        console.log("[GitHub Webhook] Socket connection error (non-critical):", err && err.message ? err.message : err);
        // wait a little to allow reconnect attempts, then cleanup
        // don't immediately resolve — let reconnection attempts run
      };

      const handleReconnectAttempt = (attempt: number) => {
        console.log(`[GitHub Webhook] reconnect attempt ${attempt}`);
      };

      const handleReconnectFailed = () => {
        console.warn("[GitHub Webhook] reconnect failed, cleaning up");
        cleanup("reconnect_failed");
      };

      socket.on("connect", handleConnect);
      socket.on("connect_error", handleError);
      socket.on("reconnect_attempt", handleReconnectAttempt);
      socket.on("reconnect_failed", handleReconnectFailed);

      // absolute safety timeout (longer)
      absoluteTimeout = setTimeout(() => {
        console.warn("[GitHub Webhook] absolute socket timeout reached, cleaning up");
        cleanup("timeout");
      }, 20000);
    });
  } catch (socketErr) {
    console.log("[GitHub Webhook] Socket emit error (non-critical):", socketErr);
  }
}

export async function POST(req: NextRequest) {
  const signature = req.headers.get("x-hub-signature-256");
  const event = req.headers.get("x-github-event");
  const delivery = req.headers.get("x-github-delivery");
  const payloadText = await req.text();

  // Debug logging
  const hasSecret = !!process.env.GITHUB_APP_WEBHOOK_SECRET;
  console.log(`[GitHub Webhook] Debug:`, {
    hasSecret,
    secretLength: process.env.GITHUB_APP_WEBHOOK_SECRET?.length || 0,
    hasSignature: !!signature,
    signaturePrefix: signature?.substring(0, 10),
    event,
    delivery,
    payloadLength: payloadText.length,
  });

  if (!GitHubAppService.verifyWebhookSignature(payloadText, signature)) {
    console.error(`[GitHub Webhook] Signature verification failed.`, {
      hasSecret,
      hasSignature: !!signature,
      signature: signature?.substring(0, 20) + "...",
    });
    return NextResponse.json({ error: "Invalid webhook signature" }, { status: 401 });
  }

  if (!event) {
    return NextResponse.json({ error: "Missing event header" }, { status: 400 });
  }

  const payload = JSON.parse(payloadText);
  console.log(`[GitHub Webhook] Event=${event} Action=${payload.action} Delivery=${delivery}`);

  try {
    const getAccountLogin = () =>
      typeof payload.installation?.account?.login === "string"
        ? payload.installation.account.login
        : typeof payload.installation?.account?.name === "string"
          ? payload.installation.account.name
          : "";

    switch (event) {
      case "installation": {
        const installation: InstallationSummary = {
          id: payload.installation.id,
          accountId: payload.installation.account?.id ?? 0,
          accountLogin: getAccountLogin(),
          repositorySelection: payload.installation.repository_selection,
          targetType: payload.installation.target_type,
          suspendedAt: payload.installation.suspended_at
            ? new Date(payload.installation.suspended_at)
            : undefined,
        };
        if (payload.action === "deleted") {
          await GitHubIntegrationService.removeInstallation(installation.id);
        } else {
          await GitHubIntegrationService.updateInstallations(installation);
        }
        break;
      }
      case "installation_repositories": {
        const installation: InstallationSummary = {
          id: payload.installation.id,
          accountId: payload.installation.account?.id ?? 0,
          accountLogin: getAccountLogin(),
          repositorySelection: payload.installation.repository_selection,
          targetType: payload.installation.target_type,
        };
        await GitHubIntegrationService.updateInstallations(installation);
        break;
      }
      case "pull_request": {
        // Handle PR events: opened, closed, merged, synchronize, etc.
        if (payload.action && ["opened", "closed", "reopened", "synchronize", "ready_for_review"].includes(payload.action)) {
          const pr = payload.pull_request;
          const owner = payload.repository.owner.login;
          const repo = payload.repository.name;
          const pullNumber = pr.number;
          const merged = Boolean(pr.merged_at);
          const state = pr.state; // "open" or "closed"
          const installationId = payload.installation?.id;

          console.log(
            `[GitHub Webhook] PR ${owner}/${repo}#${pullNumber} ${payload.action} - state: ${state}, merged: ${merged}`,
          );

          // Find all notes that have this PR linked and update their status
          await syncPrStatusToNotes({
            owner,
            repo,
            pullNumber,
            state: state as "open" | "closed",
            merged,
            installationId,
          });
        }
        break;
      }
      default:
        console.log(`[GitHub Webhook] Unhandled event type: ${event}`);
        break;
    }
  } catch (error) {
    console.error("Error handling GitHub webhook:", error);
    return NextResponse.json({ error: "Failed to process webhook" }, { status: 500 });
  }

  return NextResponse.json({ ok: true });
}

/**
 * Finds all notes with a linked PR and updates their status automatically
 */
async function syncPrStatusToNotes({
  owner,
  repo,
  pullNumber,
  state,
  merged,
  installationId,
}: {
  owner: string;
  repo: string;
  pullNumber: number;
  state: "open" | "closed";
  merged: boolean;
  installationId?: number;
}) {
  const client = await clientPromise();
  const db = client.db();
  const notesCollection = db.collection<INote>("notes");
  const databaseSourcesCollection = db.collection<IDatabaseSource>("databaseSources");

  try {
    // Find all database sources that have github_pr properties
    const allDataSources = await databaseSourcesCollection.find({}).toArray();

    for (const dataSource of allDataSources) {
      const properties = dataSource.properties || {};
      
      // Find all github_pr properties in this data source
      const githubPrProperties = Object.entries(properties).filter(
        ([_, prop]) => prop.type === "github_pr",
      );

      if (githubPrProperties.length === 0) continue;

      // Find notes in this data source that have this PR linked
      const notes = await notesCollection
        .find({
          databaseViewId: dataSource._id,
          databaseProperties: {
            $exists: true,
          },
        })
        .toArray();

      for (const note of notes) {
        if (!note.databaseProperties) continue;

        // Check each github_pr property
        for (const [propertyId, propertySchema] of githubPrProperties) {
          const prValue = note.databaseProperties[propertyId];
          if (!prValue || typeof prValue !== "object") continue;

          // Check if this note's PR matches the webhook PR
          const prOwner = prValue.owner;
          const prRepo = prValue.repo;
          const prNumber = prValue.pullNumber ?? prValue.number;

          if (
            prOwner === owner &&
            prRepo === repo &&
            Number(prNumber) === pullNumber
          ) {
            console.log(
              `[GitHub Webhook] Found matching PR in note ${note._id}, property ${propertyId}. Updating status...`,
            );

            // Check if auto-sync is enabled (default: true)
            const autoSync = propertySchema.githubPrConfig?.autoSync ?? true;
            if (!autoSync) {
              console.log(
                `[GitHub Webhook] Auto-sync disabled for property ${propertyId}, skipping update`,
              );
              continue;
            }

            // Update the PR value and status
            try {
              // Get a system user or use the note owner
              const systemUser = {
                _id: note.userId,
                id: String(note.userId),
                name: "System",
                email: note.userEmail || "system@example.com",
              };

              // Prepare the updated PR value
              const updatedPrValue = {
                ...prValue,
                state,
                merged,
                lastSyncedAt: new Date().toISOString(),
                prUpdatedAt: new Date().toISOString(),
              };

              // Use the existing updatePropertyValue logic to handle status updates
              await DatabaseService.updatePropertyValue({
                dataSourceId: String(dataSource._id),
                pageId: String(note._id),
                propertyId,
                value: updatedPrValue,
                currentUser: systemUser as any,
              });

                  console.log(
                    `[GitHub Webhook] Successfully updated note ${note._id} for PR ${owner}/${repo}#${pullNumber}`,
                  );

                  await emitNoteUpdatedEvent(String(note._id), String(dataSource._id));
            } catch (error) {
              console.error(
                `[GitHub Webhook] Failed to update note ${note._id}:`,
                error,
              );
            }
          }
        }
      }
    }
  } catch (error) {
    console.error("[GitHub Webhook] Error syncing PR status to notes:", error);
  }
}

