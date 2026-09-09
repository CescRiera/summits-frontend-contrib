import React from "react";

interface AdminSearchIconProps {
  size?: number;
  color?: string;
  className?: string | undefined;
}

const AdminSearchIcon: React.FC<AdminSearchIconProps> = ({
  size = 24,
  color = "currentColor",
  className = "",
}) => {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 100 100"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
    >
      <path
        d="M92.4 59c-.2-1.2-.9-2.2-2-2.8l-19.3-9.6c-2.6 5.3-6 11.9-10.6 19.9-2.2 3.8-6.1 6.1-10.5 6.1-4.4 0-8.4-2.3-10.6-6.1-4.2-7.2-7.4-13.2-9.8-18.2l-10.8 1.8c-1.2.2-2.2 1-2.7 2L7.9 70.6c-.8 1.7-.1 3.8 1.5 4.6L49.1 97c.5.3 1.1.4 1.7.4.2 0 .5 0 .7-.1l33.9-7c1.1-.2 2-.9 2.5-1.9.5-1 .5-2.1.1-3.1l-6.6-14.8 9.9-8.5c.9-.6 1.3-1.8 1.1-3z"
        fill={color}
      />
      <path
        d="M54.3 63c6.2-10.8 17-30.7 17-39.1 0-11.8-9.6-21.3-21.3-21.3s-21.3 9.6-21.3 21.3c0 8.4 10.8 28.3 17 39.1 1.9 3.3 6.7 3.3 8.6 0zM40.1 23.8c0-5.5 4.5-9.9 9.9-9.9s9.9 4.5 9.9 9.9c0 5.5-4.5 9.9-9.9 9.9s-9.9-4.4-9.9-9.9z"
        fill={color}
      />
    </svg>
  );
};

export default AdminSearchIcon;
