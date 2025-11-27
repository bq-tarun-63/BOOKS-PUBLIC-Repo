import React from "react";

interface AddIconProps extends React.SVGProps<SVGSVGElement> {}

export const AddIcon: React.FC<AddIconProps> = (props) => {
  return (
    <svg
      viewBox="0 0 20 20"
      width="22"
      height="22"
      fill="currentColor"
      xmlns="http://www.w3.org/2000/svg"
      style={{ display: "block", flexShrink: 0 }}
      {...props}
    >
      <path d="m16.774 4.341-.59.589-1.109-1.11.596-.594a.784.784 0 0 1 1.103 0c.302.302.302.8 0 1.102zM8.65 12.462l6.816-6.813-1.11-1.11-6.822 6.808a1.1 1.1 0 0 0-.236.393l-.289.932c-.052.196.131.38.315.314l.932-.288a.9.9 0 0 0 .394-.236"></path>
      <path d="M4.375 6.25c0-1.036.84-1.875 1.875-1.875H11a.625.625 0 1 0 0-1.25H6.25A3.125 3.125 0 0 0 3.125 6.25v7.5c0 1.726 1.4 3.125 3.125 3.125h7.5c1.726 0 3.125-1.4 3.125-3.125V9a.625.625 0 1 0-1.25 0v4.75c0 1.036-.84 1.875-1.875 1.875h-7.5a1.875 1.875 0 0 1-1.875-1.875z"></path>
    </svg>
  );
};
