'use client';

import { useState, useEffect } from 'react';
import { differenceInSeconds } from 'date-fns';
import { Clock } from 'lucide-react';

const Countdown = ({ targetDate }: { targetDate: string }) => {
  const calculateTimeLeft = () => {
    const target = new Date(targetDate);
    const now = new Date();
    
    if (isNaN(target.getTime()) || target <= now) {
      return { total: 0, hours: 0, minutes: 0, seconds: 0 };
    }

    const totalSeconds = differenceInSeconds(target, now);
    
    const hours = Math.floor(totalSeconds / 3600);
    const minutes = Math.floor((totalSeconds % 3600) / 60);
    const seconds = totalSeconds % 60;
    
    return {
      total: totalSeconds,
      hours,
      minutes,
      seconds,
    };
  };

  const [timeLeft, setTimeLeft] = useState({ total: 0, hours: 0, minutes: 0, seconds: 0 });

  useEffect(() => {
    // Set initial time left on mount to avoid hydration mismatch
    setTimeLeft(calculateTimeLeft());
  }, []);


  useEffect(() => {
    if (timeLeft.total <= 0) return;

    const timer = setInterval(() => {
      setTimeLeft(calculateTimeLeft());
    }, 1000);

    return () => clearInterval(timer);
  }, [targetDate, timeLeft.total]);

  const pad = (num: number) => num.toString().padStart(2, '0');

  if (timeLeft.total <= 0) {
      return (
        <div className="flex w-full items-center justify-center gap-2 rounded-lg px-3 py-2 text-sm font-bold text-red-500">
            <span>STARTING SOON</span>
        </div>
      );
  }

  return (
    <div className="flex w-full items-center justify-center gap-2 rounded-lg px-3 py-2 text-sm font-bold text-amber-400">
      <Clock className="h-4 w-4" />
      <span>
        STARTS IN - {pad(timeLeft.hours)}h:{pad(timeLeft.minutes)}m:{pad(timeLeft.seconds)}s
      </span>
    </div>
  );
};

export default Countdown;
