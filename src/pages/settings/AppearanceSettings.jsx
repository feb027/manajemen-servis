// src/pages/settings/AppearanceSettings.jsx
import React from 'react';
import { FiMonitor, FiSun, FiMoon, FiSmartphone } from 'react-icons/fi';

function AppearanceSettings() {

  // Placeholder: Theme state and handling logic will go here later
  // const [theme, setTheme] = useState('system');

  // Theme options data including icons and previews
  const themeOptions = [
    {
      id: 'theme-light',
      label: 'Terang',
      icon: FiSun,
      preview: (
        <div className="h-16 w-full rounded border border-gray-300 bg-white p-2 flex flex-col space-y-1 opacity-60 cursor-not-allowed">
          <div className="h-2 w-1/2 rounded-sm bg-gray-400"></div>
          <div className="h-2 w-3/4 rounded-sm bg-gray-400"></div>
          <div className="h-2 w-1/3 rounded-sm bg-gray-400"></div>
        </div>
      ),
    },
    {
      id: 'theme-dark',
      label: 'Gelap',
      icon: FiMoon,
      preview: (
        <div className="h-16 w-full rounded border border-gray-700 bg-gray-800 p-2 flex flex-col space-y-1 opacity-60 cursor-not-allowed">
          <div className="h-2 w-1/2 rounded-sm bg-gray-500"></div>
          <div className="h-2 w-3/4 rounded-sm bg-gray-500"></div>
          <div className="h-2 w-1/3 rounded-sm bg-gray-500"></div>
        </div>
      ),
    },
    {
      id: 'theme-system',
      label: 'Sistem',
      icon: FiSmartphone,
      preview: (
         <div className="h-16 w-full rounded border border-gray-500 overflow-hidden relative opacity-60 cursor-not-allowed">
           {/* Simple diagonal split representation */}
           <div className="absolute inset-0 bg-white"></div>
           <div className="absolute inset-0 bg-gray-800" style={{ clipPath: 'polygon(100% 0, 0 100%, 100% 100%)' }}></div>
           <div className="absolute inset-0 p-2 flex flex-col space-y-1">
             <div className="h-2 w-1/2 rounded-sm bg-gray-400 mix-blend-difference"></div>
             <div className="h-2 w-3/4 rounded-sm bg-gray-400 mix-blend-difference"></div>
             <div className="h-2 w-1/3 rounded-sm bg-gray-400 mix-blend-difference"></div>
           </div>
         </div>
      ),
    },
  ];

  return (
    <div className="space-y-6">
       <div className="p-6 bg-white rounded-lg shadow-md border border-gray-200">
         <h3 className="text-lg font-medium text-gray-700 mb-1 flex items-center">
           <FiMonitor className="mr-2 text-gray-500" />
           Pengaturan Tampilan
         </h3>
         <p className="text-xs text-gray-500 mb-5">Pilih preferensi tema tampilan aplikasi Anda.</p>

         <div className="space-y-4">
            <div>
                 <label className="block text-sm font-medium text-gray-700 mb-2">Tema Aplikasi</label>
                 <fieldset className="mt-2">
                    <legend className="sr-only">Pilihan Tema</legend>
                    {/* Grid layout for theme options */}
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                        {themeOptions.map((option) => (
                           <div key={option.id} className="relative flex flex-col items-center space-y-2 p-3 border border-gray-200 rounded-lg bg-gray-50/50">
                             {/* Visual Preview */}
                             {option.preview}
                             {/* Radio Button and Label */}
                             <div className="flex items-center w-full justify-center mt-2">
                                 <input 
                                    id={option.id} 
                                    name="theme-choice" // Use same name for radio group
                                    type="radio" 
                                    defaultChecked={option.id === 'theme-light'} // Example default
                                    className="h-4 w-4 border-gray-300 text-sky-600 focus:ring-sky-500 disabled:opacity-50 cursor-not-allowed"
                                    disabled 
                                />
                                 <label htmlFor={option.id} className="ml-2 block text-sm text-gray-600 font-medium cursor-not-allowed flex items-center">
                                   <option.icon className="w-4 h-4 mr-1.5 text-gray-400"/>
                                   {option.label}
                                </label>
                              </div>
                              {/* Overlay to visually disable */}
                              <div className="absolute inset-0 bg-white/30 cursor-not-allowed rounded-lg"></div> 
                           </div>
                        ))}
                    </div>
                 </fieldset>
                 <p className="mt-4 text-xs text-gray-500 text-center">Pengaturan tema akan diaktifkan pada pembaruan mendatang.</p>
             </div>
         </div>
       </div>
    </div>
  );
}

export default AppearanceSettings;
