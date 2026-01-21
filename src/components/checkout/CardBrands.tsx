const CardBrands = () => {
  return (
    <div className="flex items-center justify-center gap-4 py-3">
      {/* Visa */}
      <div className="h-8 px-2 rounded bg-white flex items-center justify-center shadow-sm">
        <svg viewBox="0 0 780 500" className="h-5 w-auto">
          <path fill="#1434CB" d="M293.2 348.7l33.4-195.2h53.4l-33.4 195.2h-53.4zm246.1-190.5c-10.6-4-27.2-8.3-47.9-8.3-52.8 0-90 26.5-90.3 64.5-.3 28.1 26.6 43.7 46.9 53.1 20.8 9.6 27.8 15.7 27.7 24.3-.1 13.1-16.6 19.1-32 19.1-21.4 0-32.8-3-50.4-10.2l-6.9-3.1-7.5 43.8c12.5 5.5 35.7 10.2 59.8 10.5 56.2 0 92.6-26.2 93.1-66.8.2-22.3-14.1-39.2-45-53.2-18.7-9.1-30.2-15.1-30.1-24.3 0-8.1 9.7-16.8 30.7-16.8 17.5-.3 30.2 3.5 40.1 7.5l4.8 2.3 7.2-42.4h.8zm138.8-4.7h-41.3c-12.8 0-22.4 3.5-28 16.2l-79.4 179.3h56.2s9.2-24.1 11.3-29.4h68.6c1.6 6.9 6.5 29.4 6.5 29.4h49.6l-43.5-195.5zm-65.6 126.3c4.4-11.3 21.4-54.7 21.4-54.7-.3.5 4.4-11.4 7.1-18.8l3.6 17s10.3 47 12.5 56.5h-44.6zM246.8 153.5l-52.3 133.2-5.6-27.1c-9.7-31.2-40-65.1-73.8-82l47.8 170.8 56.6-.1 84.3-194.8h-57z"/>
          <path fill="#F9A533" d="M146.9 153.5H59.6l-.7 4c67.2 16.2 111.7 55.4 130.1 102.5l-18.8-90.2c-3.2-12.3-12.7-15.8-23.3-16.3z"/>
        </svg>
      </div>

      {/* Mastercard */}
      <div className="h-8 px-2 rounded bg-white flex items-center justify-center shadow-sm">
        <svg viewBox="0 0 780 500" className="h-5 w-auto">
          <rect fill="#fff" x="252" y="74" width="276" height="352"/>
          <circle fill="#EB001B" cx="286" cy="250" r="176"/>
          <circle fill="#F79E1B" cx="494" cy="250" r="176"/>
          <path fill="#FF5F00" d="M390 109.4c-48.4 38.6-79.4 97.8-79.4 164.6s31 126 79.4 164.6c48.4-38.6 79.4-97.8 79.4-164.6s-31-126-79.4-164.6z"/>
        </svg>
      </div>

      {/* Elo */}
      <div className="h-8 px-2 rounded bg-white flex items-center justify-center shadow-sm">
        <svg viewBox="0 0 780 500" className="h-5 w-auto">
          <path fill="#FFF100" d="M226.4 145.8c-58.7 17.7-101.4 72.2-101.4 136.5 0 20.1 4.2 39.2 11.7 56.5l89.7-27.1v-165.9z"/>
          <path fill="#00A3DF" d="M136.7 338.8c26.3 46.6 76.4 78 134.1 78 32.5 0 62.5-10.1 87.2-27.3l-52.6-74.1-168.7 23.4z"/>
          <path fill="#EE4123" d="M357.9 389.5c31.7-29 51.6-70.7 51.6-117.2 0-70.2-45.6-129.8-108.9-150.8v194.1l57.3 73.9z"/>
          <ellipse fill="#231F20" cx="560" cy="250" rx="95" ry="95"/>
          <path fill="#FFF" d="M560 180c-38.7 0-70 31.3-70 70s31.3 70 70 70 70-31.3 70-70-31.3-70-70-70zm0 110c-22.1 0-40-17.9-40-40s17.9-40 40-40 40 17.9 40 40-17.9 40-40 40z"/>
        </svg>
      </div>

      {/* American Express */}
      <div className="h-8 px-2 rounded bg-white flex items-center justify-center shadow-sm">
        <svg viewBox="0 0 780 500" className="h-5 w-auto">
          <path fill="#016FD0" d="M0 0h780v500H0z"/>
          <path fill="#FFF" d="M327 242.5l-15-35.9-15 35.9h30zm234.1-54.5h-33.6l-38 42.3-36-42.3h-109l-17.6 39.3-17.6-39.3h-58.7l-44.7 95h30l8.4-20h45.5l8.4 20h52.7v-72.4l34.2 72.4h22.2l34.2-72.4v72.4h26.8l37.3-42 36 42h33.6l-52.6-47.6 52.6-47.4h-33.6l-36 40.5 35.5-40.5h.7zm-117.5 32.4V283h-26.8v-31.2l-42-63.7h31.1l24.6 40.6 24.7-40.6h31.1l-42.7 31.3z"/>
        </svg>
      </div>

      {/* Hipercard */}
      <div className="h-8 px-2 rounded bg-white flex items-center justify-center shadow-sm">
        <svg viewBox="0 0 780 500" className="h-5 w-auto">
          <path fill="#822124" d="M0 0h780v500H0z"/>
          <circle fill="#FFF" cx="390" cy="250" r="180"/>
          <circle fill="#822124" cx="390" cy="250" r="130"/>
          <circle fill="#FFF" cx="390" cy="250" r="80"/>
          <path fill="#822124" d="M360 230h60v40h-60z"/>
        </svg>
      </div>
    </div>
  );
};

export default CardBrands;
