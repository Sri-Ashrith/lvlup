import { motion } from 'framer-motion';
import MissionCard from './MissionCard';

const MISSIONS = [
  {
    name: 'Entry Arena',
    risk: 'Low',
    reward: 1500,
    status: 'Active',
    description: 'Solve logic, AI detection, and tech-guessing challenges to unlock your first earnings.',
  },
  {
    name: 'Skill Arenas',
    risk: 'Medium',
    reward: 3000,
    status: 'Locked',
    description: 'Take on focused tracks like Brain.exe, Build Without Code, and Prompt Wars.',
  },
  {
    name: 'Tech Heist',
    risk: 'High',
    reward: 5000,
    status: 'Locked',
    description: 'Target rival teams, crack their vault, and steal cash under pressure.',
  },
];

export default function MissionBoard() {
  return (
    <section className="relative py-20 px-4 md:px-6 lg:px-8">
      <div className="max-w-6xl mx-auto">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: '-100px' }}
          transition={{ duration: 0.5 }}
          className="mb-8 md:mb-10"
        >
          <p className="text-gta-green text-xs font-condensed tracking-[0.25em] uppercase mb-2">
            Classified Operations
          </p>
          <h2 className="text-white font-gta text-3xl md:text-4xl tracking-[0.08em] uppercase">
            Mission Board
          </h2>
        </motion.div>

        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-5 md:gap-6">
          {MISSIONS.map((mission, index) => (
            <MissionCard key={mission.name} mission={mission} index={index} />
          ))}
        </div>
      </div>
    </section>
  );
}
