import { Shield, Lock } from 'lucide-react';

const SecurityFooter = () => {
  return (
    <div className="flex flex-col items-center gap-3 py-4">
      <div className="flex items-center gap-4">
        {/* SSL Badge */}
        <div className="flex items-center gap-1.5 text-muted-foreground">
          <Lock className="h-3.5 w-3.5" />
          <span className="text-[10px] font-medium">SSL Seguro</span>
        </div>

        <div className="w-px h-3 bg-border" />

        {/* PCI Badge */}
        <div className="flex items-center gap-1.5 text-muted-foreground">
          <Shield className="h-3.5 w-3.5" />
          <span className="text-[10px] font-medium">PCI Compliant</span>
        </div>

        <div className="w-px h-3 bg-border" />

        {/* Encryption Badge */}
        <div className="flex items-center gap-1.5 text-muted-foreground">
          <svg className="h-3.5 w-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
            <path d="M7 11V7a5 5 0 0 1 10 0v4" />
          </svg>
          <span className="text-[10px] font-medium">256-bit</span>
        </div>
      </div>

      <p className="text-[10px] text-muted-foreground text-center max-w-xs">
        Suas informações são criptografadas e processadas em ambiente seguro
      </p>
    </div>
  );
};

export default SecurityFooter;
