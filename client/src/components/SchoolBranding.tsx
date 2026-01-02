import { useSchool } from "@/lib/useSchool";

interface SchoolBrandingProps {
  className?: string;
  showLogo?: boolean;
  showName?: boolean;
}

export function SchoolBranding({ 
  className = "", 
  showLogo = true, 
  showName = true 
}: SchoolBrandingProps) {
  const { school } = useSchool();

  return (
    <div className={`flex items-center gap-2 p-1 ${className}`}>
      {showLogo && school.logo && (
        <div className="w-7 h-7 sm:w-8 sm:h-8 rounded-full overflow-hidden flex-shrink-0 shadow-sm">
          <img 
            src={school.logo} 
            alt={school.name} 
            className="w-full h-full object-cover"
          />
        </div>
      )}
      {showName && (
        <div>
          <h1 className="text-lg font-bold leading-tight">{school.brandName}</h1>
        </div>
      )}
    </div>
  );
}
