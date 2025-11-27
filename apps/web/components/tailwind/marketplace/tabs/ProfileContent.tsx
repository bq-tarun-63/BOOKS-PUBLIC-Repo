"use client";

import { useState, useEffect } from "react";
import { useMarketplace } from "@/contexts/marketplaceContext";
import { useAuth } from "@/hooks/use-auth";
import { Loader2 } from "lucide-react";
import { GenericButton } from "@/components/tailwind/common/GenericButton";
import { GenericInput } from "@/components/tailwind/common/GenericInput";
import { uploadCoverImage } from "@/components/tailwind/image-upload";
import { Skeleton } from "@/components/tailwind/ui/skeleton";

type MarketplaceProfileFormData = {
  profilePicture: string;
  coverPhoto: string;
  displayName: string;
  bio: string;
  handle: string;
  allowEmailContact: boolean;
  socialLinks: string[];
};

export function ProfileContent() {
  const { profile, isLoading, isCreating, isUpdating, createProfile, updateProfile } = useMarketplace();
  const { user } = useAuth();
  const [formData, setFormData] = useState<MarketplaceProfileFormData>({
    displayName: "",
    bio: "",
    handle: "",
    allowEmailContact: false,
    socialLinks: [""],
    profilePicture: "",
    coverPhoto: "",
  });
  const [emailToContact, setEmailToContact] = useState<string>("");
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [coverPhoto, setCoverPhoto] = useState<string>("");
  const [profilePicture, setProfilePicture] = useState<string>("");
  const [isUploadingCover, setIsUploadingCover] = useState(false);
  const [isUploadingProfile, setIsUploadingProfile] = useState(false);
  const [initialFormData, setInitialFormData] = useState<MarketplaceProfileFormData | null>(null);
  const [initialCoverPhoto, setInitialCoverPhoto] = useState<string>("");
  const [initialProfilePicture, setInitialProfilePicture] = useState<string>("");
  const [initialEmailToContact, setInitialEmailToContact] = useState<string>("");

  // Check if form has changed
  const hasFormChanged = () => {
    if (!initialFormData) return true; // New profile, allow save
    
    const cleanedLinks = formData.socialLinks.map((link) => link.trim()).filter((link) => link.length > 0);
    const initialCleanedLinks = initialFormData.socialLinks.map((link) => link.trim()).filter((link) => link.length > 0);
    
    return (
      formData.displayName.trim() !== initialFormData.displayName.trim() ||
      formData.bio.trim() !== (initialFormData.bio || "").trim() ||
      formData.handle.trim() !== initialFormData.handle.trim() ||
      formData.allowEmailContact !== initialFormData.allowEmailContact ||
      JSON.stringify(cleanedLinks) !== JSON.stringify(initialCleanedLinks) ||
      coverPhoto !== initialCoverPhoto ||
      profilePicture !== initialProfilePicture ||
      emailToContact.trim() !== initialEmailToContact.trim()
    );
  };

  useEffect(() => {
    if (profile) {
      const profileFormData = {
        displayName: profile.displayName || "",
        bio: profile.bio || "",
        handle: profile.handle || "",
        allowEmailContact: profile.allowEmailContact ?? false,
        socialLinks: profile.socialLinks?.length ? profile.socialLinks : [""],
        profilePicture: profile.profilePicture || "",
        coverPhoto: profile.coverPhoto || "",
      };
      setFormData(profileFormData);
      setCoverPhoto(profile.coverPhoto || "");
      setProfilePicture(profile.profilePicture || "");
      setEmailToContact(profile.emailToContact || "");
      // Store initial state for change detection
      setInitialFormData(profileFormData);
      setInitialCoverPhoto(profile.coverPhoto || "");
      setInitialProfilePicture(profile.profilePicture || "");
      setInitialEmailToContact(profile.emailToContact || "");
      setShowCreateForm(true); // Show form when profile exists
    } else {
      // Initialize with user data if available
      const emptyFormData = {
        displayName: user?.name || "",
        bio: "",
        handle: "",
        allowEmailContact: false,
        socialLinks: [""],
        profilePicture: "",
        coverPhoto: "",
      };
      setFormData(emptyFormData);
      setCoverPhoto("");
      setProfilePicture("");
      setEmailToContact("");
      setInitialFormData(null); // No initial state for new profile
      setInitialCoverPhoto("");
      setInitialProfilePicture("");
      setInitialEmailToContact("");
    }
  }, [profile, user]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    // Validate email if allowEmailContact is true
    if (formData.allowEmailContact && !emailToContact.trim()) {
      return; // Error message will be shown by the input field
    }

    const cleanedLinks = formData.socialLinks.map((link) => link.trim()).filter((link) => link.length > 0);

    const payload = {
      displayName: formData.displayName.trim(),
      bio: formData.bio.trim(),
      handle: formData.handle.trim(),
      allowEmailContact: formData.allowEmailContact,
      emailToContact: formData.allowEmailContact ? emailToContact.trim() : "",
      socialLinks: cleanedLinks.length > 0 ? cleanedLinks : [""],
      coverPhoto: coverPhoto,
      profilePicture: profilePicture,
      // Legacy fields for backend compatibility
      name: formData.displayName.trim(),
    };

    if (profile) {
      await updateProfile(payload);
      // Update initial state after successful update
      setInitialFormData({
        ...formData,
        displayName: formData.displayName.trim(),
        bio: formData.bio.trim(),
        handle: formData.handle.trim(),
        socialLinks: cleanedLinks.length > 0 ? cleanedLinks : [""],
      });
      setInitialCoverPhoto(coverPhoto);
      setInitialProfilePicture(profilePicture);
      setInitialEmailToContact(emailToContact.trim());
    } else {
      await createProfile(payload);
      setShowCreateForm(false);
    }
  };

  const handleCoverPhotoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Validate file size (max 2MB as per UI)
    if (file.size / 1024 / 1024 > 2) {
      alert("File size too big (max 2MB).");
      return;
    }

    setIsUploadingCover(true);
    try {
      const url = await uploadCoverImage(file, { noteId: profile?._id || user?.email });
      setCoverPhoto(url);
    } catch (error) {
      console.error("Failed to upload cover photo:", error);
    } finally {
      setIsUploadingCover(false);
      // Reset input
      e.target.value = "";
    }
  };

  const handleProfilePictureUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Validate file size (max 2MB)
    if (file.size / 1024 / 1024 > 2) {
      alert("File size too big (max 2MB).");
      return;
    }

    setIsUploadingProfile(true);
    try {
      const url = await uploadCoverImage(file, { noteId: profile?._id || user?.email });
      setProfilePicture(url);
    } catch (error) {
      console.error("Failed to upload profile picture:", error);
    } finally {
      setIsUploadingProfile(false);
      // Reset input
      e.target.value = "";
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleLinkChange = (index: number, value: string) => {
    setFormData((prev) => {
      const newLinks = [...prev.socialLinks];
      newLinks[index] = value;
      return { ...prev, socialLinks: newLinks };
    });
  };

  const addLink = () => {
    if (formData.socialLinks.length < 5) {
      setFormData((prev) => ({
        ...prev,
        socialLinks: [...prev.socialLinks, ""],
      }));
    }
  };

  const removeLink = (index: number) => {
    if (formData.socialLinks.length > 1) {
      setFormData((prev) => {
        const newLinks = prev.socialLinks.filter((_, i) => i !== index);
        return { ...prev, socialLinks: newLinks.length > 0 ? newLinks : [""] };
      });
    }
  };

  const toggleAllowEmails = () => {
    setFormData((prev) => ({ ...prev, allowEmailContact: !prev.allowEmailContact }));
  };

  if (isLoading) {
    return (
      <section className="w-[66vw] mx-auto">
        <div className="flex flex-col gap-6">
          <div className="flex flex-col gap-2">
            <Skeleton className="h-10 w-64" />
            <Skeleton className="h-6 w-96" />
          </div>
          
          <div className="flex flex-col gap-8 mt-14">
            {/* Cover photo skeleton */}
            <Skeleton className="w-full h-48 rounded-md" />
            
            {/* Profile picture skeleton */}
            <div className="flex items-center gap-4">
              <Skeleton className="h-14 w-14 rounded-full" />
              <Skeleton className="h-10 w-40" />
            </div>
            
            {/* Form fields skeleton */}
            <div className="flex flex-col gap-8">
              <div className="flex flex-col gap-2">
                <Skeleton className="h-4 w-24" />
                <Skeleton className="h-10 w-full" />
              </div>
              <div className="flex flex-col gap-2">
                <Skeleton className="h-4 w-32" />
                <Skeleton className="h-10 w-full" />
              </div>
              <div className="flex flex-col gap-2">
                <Skeleton className="h-4 w-20" />
                <Skeleton className="h-10 w-full" />
              </div>
              <div className="flex flex-col gap-2">
                <Skeleton className="h-4 w-40" />
                <Skeleton className="h-20 w-full" />
              </div>
            </div>
            
            {/* Social links skeleton */}
            <div className="flex flex-col gap-6 mt-8">
              <div className="flex flex-col gap-1">
                <Skeleton className="h-6 w-32" />
                <Skeleton className="h-4 w-64" />
              </div>
              <div className="flex flex-col gap-2">
                <Skeleton className="h-10 w-full" />
                <Skeleton className="h-10 w-full" />
              </div>
            </div>
            
            {/* Save button skeleton */}
            <div className="flex justify-end mt-10">
              <Skeleton className="h-10 w-32" />
            </div>
          </div>
        </div>
      </section>
    );
  }

  // Show initial create profile prompt if profile doesn't exist and form not shown
  if (!profile && !isCreating && !showCreateForm) {
    return (
      <section className="w-[66vw] mx-auto">
        <div className="flex flex-col flex-wrap gap-6">
          <div className="flex flex-col gap-1">
            <div className="text-4xl font-semibold text-zinc-700 dark:text-zinc-100">Marketplace Profile</div>
            <div className="text-base text-zinc-600 dark:text-zinc-400">
              Create a Marketplace Profile to submit and manage listings on the Marketplace.
            </div>
            <div className="text-sm text-zinc-500 dark:text-zinc-400">
              Your Marketplace Profile is separate from your Books user account.
            </div>
          </div>
          <div>
            <GenericButton label="Create a Profile" onClick={() => setShowCreateForm(true)} />
          </div>
        </div>
      </section>
    );
  }

  // Show form for both create and edit
  if (profile || showCreateForm) {
    return (
      <section className="w-[66vw] mx-auto">
        <form className="flex flex-col" onSubmit={handleSubmit}>
          <section className="relative flex-[1_1_400px] gap-3">
            <div>
              <section className="flex flex-col gap-2 mb-7">
                <div className="text-4xl leading-10 font-semibold m-0 text-zinc-700 dark:text-zinc-100">
                  Marketplace Profile
                </div>
                <div className="text-base leading-[26px] font-medium text-zinc-600 dark:text-zinc-400">
                  <div className="flex flex-col gap-1">
                    Your public profile on Books marketplace.
                  </div>
                </div>
              </section>
              <div className="scroll-mt-[300px]" />

              <div className="mt-[54px] flex flex-col mb-[72px]">
                <div className="flex gap-[15px] items-center mb-2">
                  <div
                    className="w-full h-auto aspect-[4/1] relative flex justify-center border border-zinc-200 dark:border-zinc-700 rounded-md overflow-hidden bg-zinc-50 dark:bg-zinc-900/40"
                  >
                    {coverPhoto ? (
                      <img
                        src={coverPhoto}
                        alt="Cover photo"
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <div className="text-center flex flex-col justify-center items-center gap-0.5">
                        <div className="pb-0.5">
                          <svg
                            aria-hidden="true"
                            role="graphics-symbol"
                            viewBox="0 0 20 20"
                            className="w-5 h-5 block flex-shrink-0 text-zinc-500 dark:text-zinc-400"
                            fill="currentColor"
                          >
                            <path d="M9.63 8.478a.626.626 0 0 1 .787.08l2.5 2.5.08.098a.626.626 0 0 1-.866.867l-.099-.08-1.407-1.408v6.715a.625.625 0 1 1-1.25 0v-6.766l-1.458 1.458a.626.626 0 0 1-.885-.884l2.5-2.5z"></path>
                            <path d="M10.45 3.525a6.474 6.474 0 0 1 6.474 6.42 3.495 3.495 0 0 1-1.544 6.526l-.18.005-.039-.001h-3.286v-1.25h3.245l.026-.001h.059a2.244 2.244 0 0 0 .848-4.318l-.411-.169.024-.443q.01-.155.01-.294A5.226 5.226 0 0 0 5.25 9.49l-.047.483-.478.074a2.606 2.606 0 0 0-2.2 2.574l.012.253a2.605 2.605 0 0 0 2.372 2.34l.075.008.012.004h3.129v1.25H4.929a1 1 0 0 1-.175-.02A3.854 3.854 0 0 1 1.28 12.81l-.006-.189a3.86 3.86 0 0 1 2.793-3.707 6.476 6.476 0 0 1 6.383-5.389m4.799 12.942h.006l.008-.001z"></path>
                          </svg>
                        </div>
                        <div className="text-[13.5px] leading-[19px] text-zinc-600 dark:text-zinc-400">Upload Header Image</div>
                        <div className="text-xs leading-[17px] text-zinc-500 dark:text-zinc-400">1920 × 480 • Max 2MB</div>
                      </div>
                    )}
                    <div className="absolute right-2 bottom-2 flex gap-2">
                      <input
                        type="file"
                        id="cover-photo-upload"
                        accept="image/*"
                        onChange={handleCoverPhotoUpload}
                        className="hidden"
                      />
                      <label
                        htmlFor="cover-photo-upload"
                        className="inline-flex items-center gap-2 rounded-md border border-zinc-300 dark:border-zinc-600 bg-white dark:bg-zinc-900 px-3 py-1.5 text-sm font-medium text-zinc-900 dark:text-zinc-100 hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors cursor-pointer"
                      >
                        {isUploadingCover ? (
                          <>
                            <Loader2 className="w-4 h-4 animate-spin" />
                            Uploading...
                          </>
                        ) : coverPhoto ? (
                          "Change cover image"
                        ) : (
                          "Upload cover image"
                        )}
                      </label>
                    </div>
                  </div>
                </div>

                <div className="mt-8 mb-6">
                  <div className="flex gap-[15px] items-center justify-start">
                    <div
                      className="flex justify-center items-center h-14 w-14 rounded-full border border-zinc-200 dark:border-zinc-700 bg-zinc-100 dark:bg-zinc-800 overflow-hidden"
                    >
                      {profilePicture ? (
                        <img
                          src={profilePicture}
                          alt="Profile picture"
                          className="w-full h-full object-cover"
                        />
                      ) : (
                        <svg
                          aria-hidden="true"
                          role="graphics-symbol"
                          viewBox="0 0 20 20"
                          className="w-10 h-10 block text-zinc-500 dark:text-zinc-400"
                          fill="currentColor"
                        >
                          <path d="M10 2.375c-1.137 0-2.054.47-2.674 1.242-.608.757-.9 1.765-.9 2.824s.292 2.066.9 2.824c.62.772 1.537 1.241 2.674 1.241s2.055-.469 2.675-1.241c.608-.758.9-1.766.9-2.824 0-1.059-.292-2.067-.9-2.824-.62-.773-1.538-1.242-2.675-1.242m0 9.255c-2.7 0-5.101 1.315-6.12 3.305-.361.706-.199 1.421.23 1.923.412.48 1.06.767 1.74.767h8.3c.68 0 1.328-.287 1.74-.767.429-.502.591-1.217.23-1.923-1.02-1.99-3.42-3.305-6.12-3.305"></path>
                        </svg>
                      )}
                    </div>
                    <div className="flex items-center gap-2">
                      <input
                        type="file"
                        id="profile-picture-upload"
                        accept="image/*"
                        onChange={handleProfilePictureUpload}
                        className="hidden"
                      />
                      <label
                        htmlFor="profile-picture-upload"
                        className="inline-flex items-center gap-2 rounded-md border border-zinc-300 dark:border-zinc-600 bg-white dark:bg-zinc-900 px-3 py-1.5 text-sm font-medium text-zinc-900 dark:text-zinc-100 hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors cursor-pointer"
                      >
                        {isUploadingProfile ? (
                          <>
                            <Loader2 className="w-4 h-4 animate-spin" />
                            Uploading...
                          </>
                        ) : profilePicture ? (
                          "Change profile picture"
                        ) : (
                          "Upload profile picture"
                        )}
                      </label>
                    </div>
                  </div>
                </div>

                <div className="flex flex-col gap-8">
                  <GenericInput
                    label="Books account"
                    id="books-account"
                    type="text"
                    value={user?.email || ""}
                    disabled
                  />

                  <GenericInput
                    label="Display name"
                    id="display-name"
                    name="displayName"
                    required
                    placeholder="This is the name that will be associated on your listings."
                    type="text"
                    value={formData.displayName}
                    onChange={handleChange}
                    helperText="Can be different from your Notion account name. This can be the name of your company or organization."
                  />

                  <GenericInput
                    label="Handle"
                    id="profile-handle"
                    name="handle"
                    required
                    placeholder="@"
                    type="text"
                    value={formData.handle}
                    onChange={handleChange}
                  />

                  <div className="flex flex-col gap-3">
                    <label htmlFor="emailToggle" className="text-xs font-medium text-zinc-500 dark:text-zinc-400">
                      Let people email me
                    </label>
                    <button
                      id="emailToggle"
                      type="button"
                      aria-pressed={formData.allowEmailContact}
                      onClick={toggleAllowEmails}
                      className={`relative inline-flex h-5 w-10 items-center rounded-full transition-colors ${
                        formData.allowEmailContact ? "bg-zinc-900" : "bg-zinc-300 dark:bg-zinc-700"
                      }`}
                    >
                      <span
                        className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                          formData.allowEmailContact ? "translate-x-5" : "translate-x-1"
                        }`}
                      />
                    </button>
                  </div>

                  {formData.allowEmailContact && (
                    <GenericInput
                      label="Email"
                      id="email-to-contact"
                      type="email"
                      value={emailToContact}
                      onChange={(e) => setEmailToContact(e.target.value)}
                      helperText="Can be different from your Books email. Will be publicly displayed."
                      required={formData.allowEmailContact}
                      error={
                        formData.allowEmailContact && !emailToContact.trim()
                          ? "Please enter a contact email address for your profile."
                          : undefined
                      }
                    />
                  )}

                  <GenericInput
                    as="textarea"
                    label="A short description of yourself"
                    id="profile-description"
                    name="bio"
                    required
                    maxLength={280}
                    rows={3}
                    value={formData.bio}
                    onChange={handleChange}
                    placeholder="Tell us about yourself"
                    characterCount={{
                      current: formData.bio?.length || 0,
                      max: 280,
                    }}
                  />
                </div>
              </div>

              <div className="flex flex-col gap-16">
                <div className="flex flex-col w-full gap-6">
                  <div className="flex flex-col gap-1">
                    <h3 className="text-xl font-semibold text-zinc-900 dark:text-zinc-100">Websites</h3>
                    <p className="text-sm text-zinc-600 dark:text-zinc-400">
                      Display up to five links on your Profile, including your website and social media links.
                    </p>
                  </div>
                  <div className="flex flex-col gap-2">
                    {formData.socialLinks.map((link, index) => (
                      <div key={index} className="flex items-center gap-2">
                        <div className="flex-1">
                          <GenericInput
                            label={`Link ${index + 1}`}
                            id={`profile-link-${index}`}
                            type="url"
                            placeholder="https://"
                            value={link}
                            onChange={(e) => handleLinkChange(index, e.target.value)}
                          />
                        </div>
                        {formData.socialLinks.length > 1 && (
                          <button
                            type="button"
                            onClick={() => removeLink(index)}
                            className="mt-6 px-3 py-2 text-sm font-medium text-red-600 dark:text-red-400 hover:text-red-700 dark:hover:text-red-300"
                          >
                            Remove
                          </button>
                        )}
                      </div>
                    ))}
                  </div>
                  {formData.socialLinks.length < 5 && (
                    <div>
                      <button
                        type="button"
                        onClick={addLink}
                        className="inline-flex items-center h-8 px-3 rounded-md border border-zinc-300 dark:border-zinc-600 text-sm font-medium text-zinc-900 dark:text-zinc-100 hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors"
                      >
                        Add a Link
                      </button>
                    </div>
                  )}
                </div>
              </div>

              <div className="flex flex-row justify-end items-center gap-3 mt-10 bg-white dark:bg-zinc-900/50 pt-2 pb-5">
                <GenericButton
                  type="submit"
                  disabled={isCreating || isUpdating || (profile ? !hasFormChanged() : false)}
                  label={isCreating || isUpdating ? "Saving..." : profile ? "Save Changes" : "Save"}
                  leadingIcon={isCreating || isUpdating ? <Loader2 className="w-4 h-4 animate-spin" /> : undefined}
                />
              </div>
            </div>
          </section>
        </form>
      </section>
    );
  }

  // Fallback (should not reach here)
  return null;
}

