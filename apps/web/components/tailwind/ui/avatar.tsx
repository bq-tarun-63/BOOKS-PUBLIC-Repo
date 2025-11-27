"use client";

import { cva, type VariantProps } from "class-variance-authority";

// Avatar component
const avatarVariants = cva(
  "rounded-full flex items-center justify-center text-white font-medium border-2 border-white shadow-sm dark:border-gray-800",
  {
    variants: {
      size: {
        sm: "w-8 h-8 text-xs",
        md: "w-10 h-10 text-sm",
        lg: "w-12 h-12 text-base",
      },
    },
    defaultVariants: {
      size: "sm",
    },
  }
);

interface AvatarProps extends VariantProps<typeof avatarVariants> {
  name?: string;
  email?: string;
  className?: string;
}

export const Avatar = ({ name, email, size, className = "" }: AvatarProps) => {
  const displayName = name || email || '?';
  
  const getInitial = (text: string) => {
    return text?.charAt(0)?.toUpperCase() || '?';
  };

  const getColorFromName = (text: string) => {
    const colors = [
      "bg-orange-500", "bg-rose-400", "bg-yellow-500", "bg-green-500", "bg-emerald-700", 
      "bg-sky-500", "bg-blue-500", "bg-indigo-600", "bg-indigo-300", "bg-purple-600", 
      "bg-red-600", "bg-pink-600", "bg-purple-600", 
      "bg-violet-700", "bg-indigo-700", "bg-cyan-600", "bg-teal-500", 
      "bg-green-600",
    ];
    
    return colors[text.charCodeAt(0) % colors.length];

  };

  return (
    <div 
      className={`${avatarVariants({ size })} ${getColorFromName(displayName)} ${className}`}
      title={displayName}
    >
      {getInitial(displayName)}
    </div>
  );
};

// Overlapping Avatars Component
interface OverlappingAvatarsProps {
  members: Array<{ userName?: string; userEmail?: string }>;
  maxVisible?: number;
  avatarSize?: "sm" | "md" | "lg";
}

export const OverlappingAvatars = ({ 
  members, 
  maxVisible = 3, 
  avatarSize = "sm" 
}: OverlappingAvatarsProps) => {
  const visibleMembers = members.slice(0, maxVisible);
  const remainingCount = members.length - maxVisible;

  return (
    <div className="flex items-center">
      <div className="flex -space-x-3">
        {visibleMembers.map((member, index) => (
          <div 
            key={member.userEmail || index} 
            style={{ zIndex: maxVisible - index }}
          >
            <Avatar 
              name={member.userName}
              email={member.userEmail}
              size={avatarSize}
            />
          </div>
        ))}
        {remainingCount > 0 && (
          <div 
            className={`${avatarVariants({ size: avatarSize })} bg-gray-400 dark:bg-gray-600`}
            style={{ zIndex: 0 }}
          >
            +{remainingCount}
          </div>
        )}
      </div>
      <span className="ml-2 text-sm text-gray-600 dark:text-gray-400 font-medium">
        {members.length === 1 ? '1 member' : `${members.length} members`}
      </span>
    </div>
  );
};