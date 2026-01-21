const CardBrands = () => {
  return (
    <div className="flex items-center justify-center gap-3 py-3">
      {/* Visa */}
      <div className="w-12 h-8 rounded-md bg-white/80 dark:bg-white/10 flex items-center justify-center border border-white/30 dark:border-white/10">
        <svg viewBox="0 0 48 32" className="w-8 h-5">
          <rect fill="#1A1F71" width="48" height="32" rx="4" />
          <path
            fill="#FFFFFF"
            d="M20.5 21.5h-3l1.9-11.5h3l-1.9 11.5zm-5.2 0l-2.8-7.8-.3 1.6-.9-4.8c-.2-.6-.6-.9-1.2-.9H6.2l-.1.3c.9.2 1.9.5 2.5.8.4.2.5.4.6.7l2.2 8.1h3.1l4.7-11.5h-3.1l-3 11.5zm21.7-3.7c0 2.3-2 4-5.1 4-1.3 0-2.6-.3-3.3-.6l.4-2.4.4.2c1 .4 1.6.6 2.8.6.9 0 1.8-.4 1.8-1.2 0-.5-.4-.9-1.6-1.5-1.1-.6-2.6-1.5-2.6-3.2 0-2.3 1.9-3.8 4.8-3.8 1.1 0 2.1.2 2.7.5l-.4 2.3-.3-.2c-.5-.2-1.2-.4-2-.4-1.1 0-1.6.5-1.6 1 0 .5.5.9 1.5 1.4 1.4.7 2.5 1.7 2.5 3.3zm5.3 3.7l-2.4-11.5h-2.4c-.6 0-1 .3-1.2.9l-4.3 10.6h3.1l.6-1.7h3.7l.4 1.7h2.7l-.2 0zm-3.4-4.2l1.5-4.2.9 4.2h-2.4z"
          />
        </svg>
      </div>

      {/* Mastercard */}
      <div className="w-12 h-8 rounded-md bg-white/80 dark:bg-white/10 flex items-center justify-center border border-white/30 dark:border-white/10">
        <svg viewBox="0 0 48 32" className="w-8 h-5">
          <rect fill="#000000" width="48" height="32" rx="4" />
          <circle cx="18" cy="16" r="8" fill="#EB001B" />
          <circle cx="30" cy="16" r="8" fill="#F79E1B" />
          <path
            fill="#FF5F00"
            d="M24 10.3c1.8 1.4 2.9 3.5 2.9 5.7s-1.1 4.3-2.9 5.7c-1.8-1.4-2.9-3.5-2.9-5.7s1.1-4.3 2.9-5.7z"
          />
        </svg>
      </div>

      {/* Elo */}
      <div className="w-12 h-8 rounded-md bg-white/80 dark:bg-white/10 flex items-center justify-center border border-white/30 dark:border-white/10">
        <svg viewBox="0 0 48 32" className="w-8 h-5">
          <rect fill="#000000" width="48" height="32" rx="4" />
          <path fill="#FFCB05" d="M12 12c3 0 5.5 2 6.3 4.8l-2.8 1c-.4-1.5-1.8-2.5-3.5-2.5-2 0-3.5 1.6-3.5 3.5s1.6 3.5 3.5 3.5c1.7 0 3.1-1 3.5-2.5l2.8 1c-.8 2.8-3.3 4.8-6.3 4.8-3.6 0-6.5-2.9-6.5-6.5S8.4 12 12 12z" />
          <path fill="#00A4E0" d="M23 12.5h2.5v10H23v-10zm9.5 0c-3 0-5.5 2.2-5.5 5s2.5 5 5.5 5 5.5-2.2 5.5-5-2.5-5-5.5-5zm0 7.5c-1.4 0-2.5-1.1-2.5-2.5s1.1-2.5 2.5-2.5 2.5 1.1 2.5 2.5-1.1 2.5-2.5 2.5z" />
          <path fill="#EE4023" d="M40 18.5c0 1.4 1.1 2.5 2.5 2.5h2v2.5h-2c-2.8 0-5-2.2-5-5s2.2-5 5-5h2V16h-2c-1.4 0-2.5 1.1-2.5 2.5z" />
        </svg>
      </div>

      {/* Amex */}
      <div className="w-12 h-8 rounded-md bg-white/80 dark:bg-white/10 flex items-center justify-center border border-white/30 dark:border-white/10">
        <svg viewBox="0 0 48 32" className="w-8 h-5">
          <rect fill="#006FCF" width="48" height="32" rx="4" />
          <path
            fill="#FFFFFF"
            d="M10 20l2-5 2 5h-4zm14 0l2-5 2 5h-4zM8 22h2l.5-1h3l.5 1h2l-3-7h-2l-3 7zm14 0h2l.5-1h3l.5 1h2l-3-7h-2l-3 7zm12-7h-4v7h4v-1h-2.5v-1.5h2.5v-1h-2.5V16H34v-1zm4 0l-2 3.5-2-3.5h-2l3 4.5v2.5h2v-2.5l3-4.5h-2z"
          />
        </svg>
      </div>
    </div>
  );
};

export default CardBrands;
