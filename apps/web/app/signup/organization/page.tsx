"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Loader2, Building2, CheckCircle, AlertCircle } from "lucide-react";
import * as React from "react";
import { Slot } from "@radix-ui/react-slot";
import { cva, type VariantProps } from "class-variance-authority";
import * as LabelPrimitive from "@radix-ui/react-label";
import { postWithAuth } from "@/lib/api-helpers";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/tailwind/ui/popover";
import { ChevronDown, LogOut } from "lucide-react";
import Image from "next/image";
import { useAuth } from "@/hooks/use-auth";

// ---------- LOCAL COMPONENTS ----------

// Button
const buttonVariants = cva(
  "inline-flex items-center justify-center whitespace-nowrap rounded-md text-sm font-medium ring-offset-background transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50",
  {
    variants: {
      variant: {
        default: "bg-primary text-primary-foreground hover:bg-primary/90",
        destructive: "bg-destructive text-destructive-foreground hover:bg-destructive/90",
        outline: "border border-input bg-background hover:bg-accent hover:text-accent-foreground",
      },
      size: {
        default: "h-10 px-4 py-2",
        sm: "h-9 rounded-md px-3",
        lg: "h-11 rounded-md px-8",
        icon: "h-10 w-10",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  }
);

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement>, VariantProps<typeof buttonVariants> {
  asChild?: boolean;
}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, asChild = false, ...props }, ref) => {
    const Comp = asChild ? Slot : "button";
    return <Comp ref={ref} className={buttonVariants({ variant, size, className })} {...props} />;
  }
);
Button.displayName = "Button";

// Input
interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {}
const Input = React.forwardRef<HTMLInputElement, InputProps>(({ className, type, ...props }, ref) => {
  return (
    <input
      type={type}
      ref={ref}
      className={`flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-base ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 ${className}`}
      {...props}
    />
  );
});
Input.displayName = "Input";

// Label
const Label = React.forwardRef<React.ElementRef<typeof LabelPrimitive.Root>, React.ComponentPropsWithoutRef<typeof LabelPrimitive.Root>>(
  ({ className, ...props }, ref) => {
    return <LabelPrimitive.Root ref={ref} className={`text-base font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70 ${className}`} {...props} />;
  }
);
Label.displayName = "Label";

// Alert
const Alert = React.forwardRef<HTMLDivElement, React.HTMLAttributes<HTMLDivElement> & { variant?: "default" | "destructive" }>(
  ({ className, variant = "default", ...props }, ref) => {
    const baseClasses = "relative w-full rounded-lg border p-4 [&>svg~*]:pl-7 [&>svg+div]:translate-y-[-3px] [&>svg]:absolute [&>svg]:left-4 [&>svg]:top-4 [&>svg]:text-foreground";
    const variantClasses = variant === "destructive" ? "border-destructive/50 text-destructive [&>svg]:text-destructive" : "";
    return <div ref={ref} role="alert" className={`${baseClasses} ${variantClasses} ${className}`} {...props} />;
  }
);
Alert.displayName = "Alert";

const AlertDescription = React.forwardRef<HTMLParagraphElement, React.HTMLAttributes<HTMLParagraphElement>>(
  ({ className, ...props }, ref) => <div ref={ref} className={`text-sm [&_p]:leading-relaxed ${className}`} {...props} />
);
AlertDescription.displayName = "AlertDescription";

// ---------- SIGNUP ORGANIZATION PAGE ----------

export default function SignupOrganization() {
  const [name, setName] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [fieldErrors, setFieldErrors] = useState<{ [key: string]: string }>({});
  const router = useRouter();
  const {user} = useAuth();
  const {logout } = useAuth();
  
    if (!user) return null;

  const validateField = (fieldName: string, value: string) => {
    const errors: { [key: string]: string } = {};
    if (fieldName === "name") {
      if (!value.trim()) errors.name = "Organization name is required";
      else if (value.trim().length < 2) errors.name = "Organization name must be at least 2 characters";
      else if (value.trim().length > 100) errors.name = "Organization name must be less than 100 characters";
    }
    return errors;
  };

  const handleInputChange = (value: string) => {
    setName(value);
    if (fieldErrors.name) setFieldErrors((prev) => ({ ...prev, name: "" }));
    if (error) setError("");
    const errors = validateField("name", value);
    setFieldErrors((prev) => ({ ...prev, ...errors }));
  };

  const validateForm = () => {
    const errors = validateField("name", name);
    setFieldErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validateForm()) return;

    setError("");
    setLoading(true);

    try {
      const res = await postWithAuth("/api/createOrganization", { name: name.trim() });

      if (!res || res.isError) {
        throw new Error(res?.message || "Failed to create organization. Please try again.");
      }

      router.push("/organization/workspace");
    } catch (err) {
      console.error("Organization creation error:", err);
      setError(err instanceof Error ? err.message : "Failed to create organization. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const isFormValid = name.trim().length >= 2 && !fieldErrors.name;
  
  return (
    <div className="min-h-screen w-full flex flex-col items-center justify-start bg-gradient-to-br from-slate-50 to-slate-100 dark:from-slate-900 dark:to-slate-800 px-6 py-6">
      <div className="w-full flex justify-end mb-6">
            <Popover>
              <PopoverTrigger asChild>
                <button className="flex items-center gap-2 hover:opacity-80 transition group">
                  <div className="relative h-9 w-9 overflow-hidden rounded-full border-2 border-transparent group-hover:border-gray-300 dark:group-hover:border-[rgb(42,42,42)] transition-colors">
                    {user.image && (
                      <Image
                      src={user.image}
                      alt="Profile"
                      fill
                      className="object-cover"
                      />
                    )}
                  </div>
                  <ChevronDown className="h-4 w-4 text-gray-500 dark:text-gray-300 transition-transform group-data-[state=open]:rotate-180" />
                </button>
              </PopoverTrigger>
              <PopoverContent
                className="w-64 p-2 rounded-xl shadow-lg border border-gray-200 dark:border-[rgb(42,42,42)] bg-[#f8f8f7] dark:bg-[hsl(0deg_0%_12.55%)]"
                align="end"
                sideOffset={8}
                >
                {/* User Profile Section */}
                <div className="flex items-center gap-3 p-3 border-b border-gray-100 dark:border-[rgb(42,42,42)]">
                  <div className="relative h-10 w-10 overflow-hidden rounded-full">
                    {user.image && (
                      <Image
                      src={user.image}
                      alt="Profile"
                      fill
                      className="object-cover"
                      />
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold text-gray-900 dark:text-gray-100 truncate">
                      {user.name}
                    </p>
                    <p className="text-xs text-gray-500 dark:text-gray-400 truncate">
                      {user.email}
                    </p>
                  </div>
                </div>
      
                {/* Sign Out Button */}
                <div className="p-2 pt-1 border-t border-gray-100 dark:border-[rgb(42,42,42)]">
                  <button
                    onClick={logout}
                    className="flex w-full items-center gap-3 rounded-md px-3 py-2 text-sm text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-[rgba(42,42,42,0.5)] transition-colors"
                    >
                    <LogOut className="h-4 w-4" />
                    <span>Sign out</span>
                  </button>
                </div>
              </PopoverContent>
            </Popover>
      
            </div>
      <div className="w-full max-w-md">
        {/* Header */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-20 h-20 rounded-full bg-primary/10 mb-4">
            <Building2 className="w-10 h-10 text-primary" />
          </div>
          <h1 className="text-3xl font-bold tracking-tight text-gray-900 dark:text-white">
            Create Your Organization
          </h1>
          <p className="text-base text-muted-foreground mt-2">
            Set up your organization and get your team collaborating immediately
          </p>
        </div>

        <div className="shadow-lg border-0 bg-white/80 dark:bg-slate-800/80 backdrop-blur-sm rounded-2xl p-8">
          {/* Global Error Alert */}
          {error && (
            <Alert variant="destructive" className="animate-in fade-in-0 flex items-start mb-4">
              <AlertCircle className="h-4 w-4 mt-1 mr-2" />
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}

          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Organization Name Field */}
            <div className="space-y-2">
              <Label htmlFor="name" className="text-base">
                Organization Name <span className="text-destructive">*</span>
              </Label>
              <div className="relative">
                <Input
                  id="name"
                  type="text"
                  value={name}
                  onChange={(e) => handleInputChange(e.target.value)}
                  placeholder="Enter your org."
                  className={`text-base pr-10 ${
                    fieldErrors.name
                      ? "border-destructive focus-visible:ring-destructive"
                      : name.trim().length >= 2
                      ? "border-green-500 focus-visible:ring-green-500"
                      : ""
                  }`}
                  disabled={loading}
                />
                {name.trim().length >= 2 && !fieldErrors.name && (
                  <CheckCircle className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-green-500" />
                )}
              </div>
              {fieldErrors.name && (
                <p className="text-sm text-destructive animate-in fade-in-0">{fieldErrors.name}</p>
              )}
              <p className="text-sm text-muted-foreground">
                This will be displayed to your team members
              </p>
            </div>

            {/* Submit Button */}
            <Button type="submit" disabled={loading || !isFormValid} variant="default" size="lg" className="w-full text-base">
              {loading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Creating Organization...
                </>
              ) : (
                "Create Organization"
              )}
            </Button>
          </form>
        </div>

        {/* Footer Info */}
        <div className="mt-6 text-center">
          <p className="text-sm text-muted-foreground">
            You can invite team members and manage permissions after creating your organization
          </p>
        </div>
      </div>
    </div>
  );
}
