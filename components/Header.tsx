import React from 'react';
import { Layers } from 'lucide-react';

const Header = () => {
  return (
    <header className="bg-indigo-900 text-white shadow-lg sticky top-0 z-50">
      <div className="container mx-auto px-4 py-3 flex justify-between items-center">
        <div className="flex items-center gap-2">
          <Layers className="w-6 h-6 text-indigo-300" />
          <h1 className="text-xl font-bold tracking-tight">MechFlow <span className="font-light text-indigo-300">智能制造</span></h1>
        </div>
        <nav>
          <ul className="flex gap-6 text-sm font-medium">
            <li className="text-indigo-200">生产经理控制台</li>
          </ul>
        </nav>
      </div>
    </header>
  );
};

export default Header;