import React from "react";
import { useQuery } from "@tanstack/react-query";
import { AssetLogoRequest } from "@/api/entities";
import { Coins } from "lucide-react";

const CR_COIN_ASSET_ID = "G9TVbwiiUZd5WxFxoY7Tb6ZPjGGLfynJK4a3aoC59cMo";
const CR_COIN_LOGO = "https://qtrypzzcjebvfcihiynt.supabase.co/storage/v1/object/public/base44-prod/public/68ee04aadedc18acdde68252/a89dbfe25_CRC.png";

const DCC_TOKEN_ASSET_ID = "DCC"; // Native token identifier
const DCC_TOKEN_LOGO = "https://qtrypzzcjebvfcihiynt.supabase.co/storage/v1/object/public/base44-prod/public/68ee04aadedc18acdde68252/86a220e8e_DCC.png";

export default function AssetLogo({ assetId, size = "md", className = "" }) {
  const sizeClasses = {
    xs: "w-6 h-6",
    sm: "w-8 h-8",
    md: "w-12 h-12",
    lg: "w-16 h-16",
    xl: "w-24 h-24",
  };

  const iconSizes = {
    xs: "w-3 h-3",
    sm: "w-4 h-4",
    md: "w-6 h-6",
    lg: "w-8 h-8",
    xl: "w-12 h-12",
  };

  const sizeClass = sizeClasses[size] || sizeClasses.md;
  const iconSize = iconSizes[size] || iconSizes.md;

  // Fetch approved logo for this asset
  const { data: logoRequests } = useQuery({
    queryKey: ["assetLogo", assetId],
    queryFn: async () => {
      const requests = await AssetLogoRequest.filter({
        asset_id: assetId,
        status: "approved"
      });
      return requests;
    },
    enabled: !!assetId && assetId !== CR_COIN_ASSET_ID && assetId !== DCC_TOKEN_ASSET_ID,
  });

  // Check if this is DCC token (hardcoded)
  if (assetId === DCC_TOKEN_ASSET_ID || assetId === "DCC" || assetId === "WAVES") {
    return (
      <img
        src={DCC_TOKEN_LOGO}
        alt="DCC Token"
        className={`${sizeClass} rounded-full object-cover ${className}`}
        onError={(e) => {
          e.target.style.display = 'none';
          if (e.target.nextSibling) e.target.nextSibling.style.display = 'flex';
        }}
      />
    );
  }

  // Check if this is CR Coin (hardcoded)
  if (assetId === CR_COIN_ASSET_ID) {
    return (
      <img
        src={CR_COIN_LOGO}
        alt="CR Coin"
        className={`${sizeClass} rounded-full object-cover ${className}`}
        onError={(e) => {
          e.target.style.display = 'none';
          if (e.target.nextSibling) e.target.nextSibling.style.display = 'flex';
        }}
      />
    );
  }

  // Check if there's an approved custom logo
  const approvedLogo = logoRequests?.[0];
  if (approvedLogo?.logo_url) {
    return (
      <>
        <img
          src={approvedLogo.logo_url}
          alt={approvedLogo.asset_name || "Asset"}
          className={`${sizeClass} rounded-full object-cover ${className}`}
          onError={(e) => {
            e.target.style.display = 'none';
            if (e.target.nextSibling) e.target.nextSibling.style.display = 'flex';
          }}
        />
        <div className={`${sizeClass} rounded-full bg-gradient-to-br from-blue-100 to-purple-100 items-center justify-center ${className} hidden`}>
          <Coins className={`${iconSize} text-blue-600`} />
        </div>
      </>
    );
  }

  // Placeholder for assets without logos
  return (
    <div className={`${sizeClass} rounded-full bg-gradient-to-br from-blue-100 to-purple-100 flex items-center justify-center ${className}`}>
      <Coins className={`${iconSize} text-blue-600`} />
    </div>
  );
}