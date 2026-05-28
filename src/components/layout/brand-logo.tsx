import defaultLogo from "@/assets/cloudject_cloud_icon_filled_white_blue.png";
import signupLogo from "@/assets/signup-logo.png";

type BrandLogoProps = {
  className?: string;
  alt?: string;
  variant?: "default" | "signup";
};

export function BrandLogo({
  className = "h-5 w-5",
  alt = "CloudJect logo",
  variant = "default",
}: BrandLogoProps) {
  return <img src={variant === "signup" ? signupLogo : defaultLogo} alt={alt} className={className} />;
}
