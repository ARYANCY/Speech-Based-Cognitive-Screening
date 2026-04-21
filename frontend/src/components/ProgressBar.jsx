import React, { useState } from 'react';
import { CheckCircle2, Circle } from 'lucide-react';

const ProgressBar = ({ currentStep, totalSteps, stepLabels }) => {
  return (
    <div className="w-full relative py-6">
      <div className="overflow-hidden h-2 mb-4 text-xs flex rounded-full bg-slate-200 w-full">
        <div style={{ width: `${(currentStep / (totalSteps - 1)) * 100}%` }} className="shadow-none flex flex-col text-center whitespace-nowrap text-white justify-center bg-primary-500 transition-all duration-500 rounded-full"></div>
      </div>
      
      <div className="flex justify-between mt-2">
        {stepLabels.map((label, index) => {
          const isActive = index === currentStep;
          const isCompleted = index < currentStep;
          
          return (
            <div key={index} className={`flex flex-col items-center select-none w-24 sm:w-32 ${isActive ? 'text-primary-700 font-semibold' : isCompleted ? 'text-slate-600' : 'text-slate-400'}`}>
              <div className={`flex items-center justify-center w-8 h-8 rounded-full mb-2 bg-white border-2 ${isActive ? 'border-primary-500 text-primary-500' : isCompleted ? 'border-primary-600 bg-primary-50' : 'border-slate-300'}`}>
                {isCompleted ? <CheckCircle2 className="w-5 h-5 text-primary-600" /> : <Circle className={`w-3 h-3 ${isActive ? 'fill-primary-500 text-primary-500' : 'fill-slate-300 text-slate-300'}`} />}
              </div>
              <span className="text-xs text-center tracking-tight leading-tight px-1">
                {label}
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default ProgressBar;
