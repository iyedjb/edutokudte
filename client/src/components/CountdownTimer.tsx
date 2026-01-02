import { useState, useEffect } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Clock, Calendar } from "lucide-react";

interface CountdownTimerProps {
  targetDate: Date;
  title?: string;
  description?: string;
}

interface TimeLeft {
  days: number;
  hours: number;
  minutes: number;
  seconds: number;
}

export function CountdownTimer({ targetDate, title, description }: CountdownTimerProps) {
  const calculateTimeLeft = (): TimeLeft => {
    const difference = +targetDate - +new Date();
    
    if (difference > 0) {
      return {
        days: Math.floor(difference / (1000 * 60 * 60 * 24)),
        hours: Math.floor((difference / (1000 * 60 * 60)) % 24),
        minutes: Math.floor((difference / 1000 / 60) % 60),
        seconds: Math.floor((difference / 1000) % 60),
      };
    }
    
    return { days: 0, hours: 0, minutes: 0, seconds: 0 };
  };

  const [timeLeft, setTimeLeft] = useState<TimeLeft>(calculateTimeLeft());

  useEffect(() => {
    const timer = setInterval(() => {
      setTimeLeft(calculateTimeLeft());
    }, 1000);

    return () => clearInterval(timer);
  }, [targetDate]);

  const timeUnits = [
    { label: "Dias", value: timeLeft.days },
    { label: "Horas", value: timeLeft.hours },
    { label: "Min", value: timeLeft.minutes },
    { label: "Seg", value: timeLeft.seconds },
  ];

  return (
    <div className="space-y-4">
      {title && (
        <div className="text-center space-y-2">
          <div className="flex items-center justify-center gap-2">
            <Clock className="w-6 h-6 text-primary animate-pulse" />
            <h3 className="text-2xl font-bold text-foreground">{title}</h3>
          </div>
          {description && (
            <p className="text-sm text-muted-foreground">{description}</p>
          )}
        </div>
      )}
      
      <div className="grid grid-cols-4 gap-2 sm:gap-4">
        {timeUnits.map(({ label, value }) => (
          <Card key={label} className="border-card-border bg-gradient-to-br from-primary/5 to-card">
            <CardContent className="p-3 sm:p-4 text-center">
              <div className="text-2xl sm:text-4xl font-bold text-primary tabular-nums" data-testid={`countdown-${label.toLowerCase()}`}>
                {value.toString().padStart(2, '0')}
              </div>
              <div className="text-xs sm:text-sm text-muted-foreground mt-1 font-medium">
                {label}
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="flex items-center justify-center gap-2 text-sm text-muted-foreground bg-muted/50 rounded-lg p-3">
        <Calendar className="w-4 h-4" />
        <span>Disponível em: <span className="font-semibold text-foreground">19 de Novembro, 2025</span></span>
      </div>
    </div>
  );
}
