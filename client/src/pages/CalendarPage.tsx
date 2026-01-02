import { useState, useEffect } from "react";
import { BottomNav } from "@/components/BottomNav";
import { useAuth } from "@/lib/useAuth";
import { useEvents } from "@/lib/useFirebaseData";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import {
  Calendar as CalendarIcon,
  ChevronLeft,
  ChevronRight,
  Check,
  Sparkles,
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import {
  format,
  startOfMonth,
  endOfMonth,
  eachDayOfInterval,
  isSameDay,
  isToday,
  isSameMonth,
  addMonths,
  subMonths,
  startOfWeek,
  endOfWeek,
} from "date-fns";
import { ptBR } from "date-fns/locale";
import { ref, onValue } from "firebase/database";
import { profileNotasDatabase } from "@/lib/firebase";

export default function CalendarPage() {
  const { user } = useAuth();
  const { events, loading } = useEvents();
  const [currentDate, setCurrentDate] = useState(new Date());
  const [selectedDate, setSelectedDate] = useState<Date>(new Date());
  const [userRole, setUserRole] = useState<string | null>(null);
  const [direction, setDirection] = useState(0);

  const monthStart = startOfMonth(currentDate);
  const monthEnd = endOfMonth(currentDate);
  const calendarStart = startOfWeek(monthStart, { weekStartsOn: 0 });
  const calendarEnd = endOfWeek(monthEnd, { weekStartsOn: 0 });
  const calendarDays = eachDayOfInterval({
    start: calendarStart,
    end: calendarEnd,
  });

  useEffect(() => {
    if (!user) return;
    const userProfileRef = ref(
      profileNotasDatabase,
      `userProfiles/${user.uid}`,
    );
    const unsubscribe = onValue(userProfileRef, (snapshot) => {
      if (snapshot.exists()) {
        setUserRole(snapshot.val().role || null);
      }
    });
    return () => unsubscribe();
  }, [user]);

  const filteredEvents = events.filter((e) => {
    if (e.visibility === "private") return e.createdBy === user?.uid;
    if (e.visibility === "class" && e.classId) {
      return (user?.classes || []).includes(e.classId);
    }
    return !e.visibility || e.visibility === "all";
  });

  const getEventsForDate = (date: Date) =>
    filteredEvents.filter((event) => isSameDay(new Date(event.date), date));

  const selectedDateEvents = getEventsForDate(selectedDate).sort(
    (a, b) => new Date(a.date).getTime() - new Date(b.date).getTime(),
  );

  const eventColors: Record<string, { bg: string; text: string; dot: string }> =
    {
      exam: { bg: "bg-emerald-500", text: "text-white", dot: "bg-emerald-500" },
      assignment: {
        bg: "bg-amber-400",
        text: "text-amber-950",
        dot: "bg-amber-400",
      },
      holiday: { bg: "bg-rose-500", text: "text-white", dot: "bg-rose-500" },
      meeting: { bg: "bg-blue-500", text: "text-white", dot: "bg-blue-500" },
      default: {
        bg: "bg-violet-500",
        text: "text-white",
        dot: "bg-violet-500",
      },
    };

  const getEventStyle = (type: string) =>
    eventColors[type] || eventColors.default;

  const goToPrev = () => {
    setDirection(-1);
    setCurrentDate(subMonths(currentDate, 1));
  };

  const goToNext = () => {
    setDirection(1);
    setCurrentDate(addMonths(currentDate, 1));
  };

  const slideVariants = {
    enter: (dir: number) => ({ x: dir > 0 ? 40 : -40, opacity: 0 }),
    center: { x: 0, opacity: 1 },
    exit: (dir: number) => ({ x: dir < 0 ? 40 : -40, opacity: 0 }),
  };

  return (
    <div className="min-h-screen bg-background pb-24 lg:pb-8">
      {/* Header */}
      <motion.header
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        className="sticky top-0 z-40 bg-background/95 backdrop-blur-xl border-b border-border/40"
      >
        <div className="px-5 py-5 max-w-7xl mx-auto">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 lg:w-12 lg:h-12 rounded-2xl bg-gradient-to-br from-primary/20 to-primary/5 flex items-center justify-center">
                <CalendarIcon className="w-5 h-5 lg:w-6 lg:h-6 text-primary" />
              </div>
              <div>
                <h1 className="text-xl lg:text-2xl font-bold tracking-tight">Egenda</h1>
                <p className="text-[11px] lg:text-xs text-muted-foreground capitalize">
                  {format(new Date(), "EEEE, dd MMM", { locale: ptBR })}
                </p>
              </div>
            </div>
            <Button
              size="sm"
              onClick={() => {
                setCurrentDate(new Date());
                setSelectedDate(new Date());
              }}
              className="rounded-full h-8 lg:h-9 px-4 lg:px-6 text-xs lg:text-sm font-medium shadow-sm"
            >
              Hoje
            </Button>
          </div>
        </div>
      </motion.header>

      <main className="px-5 py-5 space-y-6 max-w-7xl mx-auto lg:grid lg:grid-cols-[1fr_400px] lg:gap-8 lg:space-y-0">
        {/* Calendar Card */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, ease: "easeOut" }}
          className="lg:sticky lg:top-24"
        >
          <Card className="border-card-border rounded-[28px] shadow-lg shadow-black/[0.03] overflow-hidden">
            <CardContent className="p-5 lg:p-8">
              {/* Month Navigation */}
              <div className="flex items-center justify-between mb-5 lg:mb-8">
                <motion.button
                  whileTap={{ scale: 0.9 }}
                  onClick={goToPrev}
                  className="w-10 h-10 lg:w-12 lg:h-12 rounded-full bg-muted/50 hover:bg-muted flex items-center justify-center transition-colors"
                >
                  <ChevronLeft className="w-5 h-5 lg:w-6 lg:h-6 text-muted-foreground" />
                </motion.button>

                <AnimatePresence mode="wait" custom={direction}>
                  <motion.h2
                    key={currentDate.toISOString()}
                    custom={direction}
                    variants={slideVariants}
                    initial="enter"
                    animate="center"
                    exit="exit"
                    transition={{ duration: 0.25 }}
                    className="text-lg lg:text-2xl font-bold text-primary capitalize"
                  >
                    {format(currentDate, "MMMM yyyy", { locale: ptBR })}
                  </motion.h2>
                </AnimatePresence>

                <motion.button
                  whileTap={{ scale: 0.9 }}
                  onClick={goToNext}
                  className="w-10 h-10 lg:w-12 lg:h-12 rounded-full bg-muted/50 hover:bg-muted flex items-center justify-center transition-colors"
                >
                  <ChevronRight className="w-5 h-5 lg:w-6 lg:h-6 text-muted-foreground" />
                </motion.button>
              </div>

              {/* Day Headers */}
              <div className="grid grid-cols-7 gap-1 lg:gap-2 mb-3 lg:mb-4">
                {["Dom", "Seg", "Ter", "Qua", "Qui", "Sex", "Sab"].map(
                  (day, i) => (
                    <div
                      key={i}
                      className="text-center text-[10px] lg:text-xs font-semibold text-muted-foreground/70 py-1 lg:py-2 uppercase tracking-wide"
                    >
                      {day}
                    </div>
                  ),
                )}
              </div>

              {/* Calendar Grid */}
              <AnimatePresence mode="wait" custom={direction}>
                <motion.div
                  key={currentDate.getMonth() + "-" + currentDate.getFullYear()}
                  custom={direction}
                  variants={slideVariants}
                  initial="enter"
                  animate="center"
                  exit="exit"
                  transition={{ duration: 0.3 }}
                  className="grid grid-cols-7 gap-1.5 lg:gap-2"
                >
                  {calendarDays.map((day, index) => {
                    const dayEvents = getEventsForDate(day);
                    const isSelected = isSameDay(day, selectedDate);
                    const isTodayDay = isToday(day);
                    const isCurrentMonth = isSameMonth(day, currentDate);
                    const hasEvents = dayEvents.length > 0;

                    return (
                      <motion.button
                        key={index}
                        whileTap={{ scale: 0.88 }}
                        whileHover={{ scale: 1.05 }}
                        onClick={() => setSelectedDate(day)}
                        className={`
                          relative aspect-square rounded-2xl flex flex-col items-center justify-center
                          text-sm lg:text-base font-semibold transition-all duration-200
                          ${!isCurrentMonth ? "opacity-25" : ""}
                          ${
                            isSelected
                              ? "bg-primary text-primary-foreground shadow-lg shadow-primary/25"
                              : isTodayDay
                                ? "bg-primary/10 text-primary ring-2 ring-primary/20"
                                : "hover:bg-accent/70"
                          }
                        `}
                      >
                        <span>{format(day, "d")}</span>
                        {hasEvents && !isSelected && isCurrentMonth && (
                          <div className="absolute bottom-1 lg:bottom-2 flex gap-[3px] lg:gap-1">
                            {dayEvents.slice(0, 3).map((e, i) => (
                              <motion.div
                                key={i}
                                initial={{ scale: 0 }}
                                animate={{ scale: 1 }}
                                transition={{ delay: i * 0.05 }}
                                className={`w-[5px] h-[5px] lg:w-[6px] lg:h-[6px] rounded-full ${getEventStyle(e.type).dot}`}
                              />
                            ))}
                          </div>
                        )}
                      </motion.button>
                    );
                  })}
                </motion.div>
              </AnimatePresence>
            </CardContent>
          </Card>
        </motion.div>

        {/* Events Section */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.1 }}
          className="space-y-4 lg:space-y-6"
        >
          <div className="flex items-center justify-between px-1">
            <h3 className="text-sm lg:text-lg font-semibold text-foreground">
              {format(selectedDate, "dd 'de' MMMM", { locale: ptBR })}
            </h3>
            {selectedDateEvents.length > 0 && (
              <span className="text-xs lg:text-sm text-muted-foreground bg-muted px-2.5 lg:px-3 py-1 lg:py-1.5 rounded-full">
                {selectedDateEvents.length} evento
                {selectedDateEvents.length > 1 ? "s" : ""}
              </span>
            )}
          </div>

          <AnimatePresence mode="wait">
            {loading ? (
              <motion.div
                key="loading"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="space-y-3 lg:space-y-4"
              >
                {[1, 2, 3].map((i) => (
                  <div key={i} className="flex gap-4 animate-pulse">
                    <div className="w-14 lg:w-16 flex flex-col items-end gap-1">
                      <div className="w-10 lg:w-12 h-3 lg:h-4 bg-muted rounded" />
                    </div>
                    <div className="w-5 lg:w-6 flex justify-center">
                      <div className="w-3 h-3 lg:w-4 lg:h-4 bg-muted rounded-full" />
                    </div>
                    <div className="flex-1 h-20 lg:h-24 bg-muted rounded-2xl" />
                  </div>
                ))}
              </motion.div>
            ) : selectedDateEvents.length === 0 ? (
              <motion.div
                key="empty"
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.95 }}
                className="py-16 lg:py-24 text-center"
              >
                <motion.div
                  initial={{ scale: 0, rotate: -10 }}
                  animate={{ scale: 1, rotate: 0 }}
                  transition={{ type: "spring", stiffness: 200, damping: 15 }}
                  className="w-20 h-20 lg:w-24 lg:h-24 bg-gradient-to-br from-muted/80 to-muted/30 rounded-3xl flex items-center justify-center mx-auto mb-4 shadow-inner"
                >
                  <Sparkles className="w-8 h-8 lg:w-10 lg:h-10 text-muted-foreground/40" />
                </motion.div>
                <p className="text-sm lg:text-base font-medium text-muted-foreground">
                  Dia livre!
                </p>
                <p className="text-xs lg:text-sm text-muted-foreground/70 mt-1">
                  Nenhum evento agendado
                </p>
              </motion.div>
            ) : (
              <motion.div
                key="events"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="relative"
              >
                {/* Timeline Line */}
                <div className="absolute left-[67px] lg:left-[76px] top-3 bottom-3 w-[2px] bg-gradient-to-b from-border via-border to-transparent rounded-full" />

                <div className="space-y-3 lg:space-y-4">
                  {selectedDateEvents.map((event, i) => {
                    const style = getEventStyle(event.type);
                    const eventTime = format(new Date(event.date), "HH:mm");
                    const isPast = new Date(event.date) < new Date();

                    return (
                      <motion.div
                        key={event.id}
                        initial={{ opacity: 0, x: -20 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ delay: i * 0.08, duration: 0.4 }}
                        className="flex gap-4 items-start"
                      >
                        {/* Time */}
                        <div className="w-14 lg:w-16 text-right flex-shrink-0 pt-3 lg:pt-4">
                          <span className="text-xs lg:text-sm font-bold text-muted-foreground tabular-nums">
                            {eventTime}
                          </span>
                        </div>

                        {/* Timeline Dot */}
                        <div className="relative z-10 flex-shrink-0 pt-3 lg:pt-4">
                          <motion.div
                            initial={{ scale: 0 }}
                            animate={{ scale: 1 }}
                            transition={{
                              delay: i * 0.08 + 0.1,
                              type: "spring",
                              stiffness: 300,
                            }}
                            className={`w-5 h-5 lg:w-6 lg:h-6 rounded-full flex items-center justify-center ${
                              isPast ? "bg-muted" : "bg-primary/15"
                            }`}
                          >
                            {isPast ? (
                              <Check className="w-3 h-3 lg:w-4 lg:h-4 text-muted-foreground" />
                            ) : (
                              <div className="w-2 h-2 lg:w-2.5 lg:h-2.5 rounded-full bg-primary" />
                            )}
                          </motion.div>
                        </div>

                        {/* Event Bubble */}
                        <motion.div
                          whileTap={{ scale: 0.98 }}
                          whileHover={{ scale: 1.02 }}
                          className={`flex-1 ${style.bg} ${style.text} rounded-[20px] p-4 lg:p-5 shadow-md shadow-black/5 cursor-pointer`}
                        >
                          <h4 className="font-bold text-sm lg:text-base leading-tight mb-1">
                            {event.title}
                          </h4>
                          {event.description && (
                            <p className="text-xs lg:text-sm opacity-85 leading-relaxed line-clamp-2 lg:line-clamp-3">
                              {event.description}
                            </p>
                          )}
                        </motion.div>
                      </motion.div>
                    );
                  })}
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </motion.div>
      </main>

      <BottomNav />
    </div>
  );
}
