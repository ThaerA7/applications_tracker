"use client";

import { motion } from "framer-motion";
import JobSearchOverviewCard from "../components/overview/StatsCard";
import GoalsCard from "../components/overview/GoalsCard";
import NotesOverviewCard from "../components/overview/NotesCard";
import UpcomingCard from "../components/overview/UpcomingCard";
import RecentActivityCard from "../components/overview/RecentActivityCard";

const fadeInUp = {
  hidden: { opacity: 0, y: 20 },
  visible: { opacity: 1, y: 0 },
};

const staggerContainer = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: {
      staggerChildren: 0.1,
      delayChildren: 0.05,
    },
  },
};

export default function HomePage() {
  return (
    <section
      className={[
        "relative overflow-hidden rounded-3xl border border-neutral-200/80",
        "bg-gradient-to-br from-slate-50 via-white to-indigo-50",
        "p-4 sm:p-6 shadow-lg",
      ].join(" ")}
    >
      {/* Decorative background accents */}
      <div className="pointer-events-none absolute -top-40 -left-32 h-80 w-80 rounded-full bg-indigo-400/10 blur-3xl" />
      <div className="pointer-events-none absolute -bottom-40 -right-32 h-80 w-80 rounded-full bg-sky-400/10 blur-3xl" />

      <motion.div
        className="relative space-y-6"
        variants={staggerContainer}
        initial="hidden"
        animate="visible"
      >
        <motion.div variants={fadeInUp} transition={{ duration: 0.4, ease: "easeOut" }}>
          <JobSearchOverviewCard />
        </motion.div>

        <motion.div
          className="grid gap-6 xl:grid-cols-[minmax(0,1.7fr)_minmax(0,1.3fr)]"
          variants={fadeInUp}
          transition={{ duration: 0.4, ease: "easeOut" }}
        >
          <GoalsCard />
          <NotesOverviewCard />
        </motion.div>

        <motion.div
          className="grid gap-6 xl:grid-cols-[minmax(0,1.2fr)_minmax(0,1.8fr)]"
          variants={fadeInUp}
          transition={{ duration: 0.4, ease: "easeOut" }}
        >
          <UpcomingCard />
          <RecentActivityCard />
        </motion.div>
      </motion.div>
    </section>
  );
}
