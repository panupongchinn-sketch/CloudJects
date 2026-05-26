import cloudJectLogo from "@/assets/cloudject_cloud_icon_filled_white_blue.png";

type BrandLogoProps = {
  className?: string;
  alt?: string;
};

export function BrandLogo({
  className = "h-5 w-5",
  alt = "CloudJect logo",
}: BrandLogoProps) {
  return <img src={cloudJectLogo} alt={alt} className={className} />;
}
