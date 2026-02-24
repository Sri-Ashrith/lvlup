import { useRef } from 'react';
import { motion, useInView } from 'framer-motion';
import MissionCard from './MissionCard';

/**
 * MissionBoard — classified operation files grid
 * Replaces simple feature cards with immersive mission dossiers
 */

// Sample mission data
const MISSIONS = [
  {
    name: 'Silicon Heist',
    risk: 'High',
    reward: 500000,
    status: 'Active',
    description: 'Infiltrate the rival server room. Extract encrypted data. Leave no trace.',
  },
  {
    name: 'Ghost Protocol',
    risk: 'Medium',
    reward: 250000,
    status: 'Active',
    description: 'Deploy stealth agents across the network. Jam enemy comms.',
  },
  {
    name: 'Vault Cracker',
    risk: 'High',
    reward: 750000,
    status: 'Locked',
    description: 'The central vault holds the final key. Only the elite can attempt this.',
  },
  {
    name: 'Street Recon',
    risk: 'Low',
    reward: 100000,
    status: 'Completed',
    description: 'Scout the perimeter. Gather intel on rival crews. Report back.',
  },
  {
    name: 'Cyber Strike',
    risk: 'Medium',
    reward: 350000,
    status: 'Locked',
    description: 'Launch a coordinated digital assault on enemy infrastructure.',
  },
  {
    name: 'The Getaway',
    risk: 'High',
    reward: 1000000,
    status: 'Locked',
    description: 'The final showdown. Winner takes all. No second chances.',
  },
];

export default function MissionBoard() {
  const titleRef = useRef(null);
  const isInView = useInView(titleRef, { once: true, margin: '-100px' });

  return (
    <section className="relative py-24 md:py-32 px-4">
      {/* Section header */}
      <div ref={titleRef} className="max-w-6xl mx-auto mb-16 text-center">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={isInView ? { opacity: 1, y: 0 } : {}}
          transition={{ duration: 0.6 }}
        >
          <span className="text-[11px] font-condensed tracking-[5px] uppercase text-gta-green/60 block mb-3">
            // Operations Briefing
          </span>
          <h2 className="font-gta text-3xl md:text-4xl lg:text-5xl text-white tracking-wider mb-4">
            MISSION BOARD
          </h2>
          <div className="w-24 h-[2px] mx-auto bg-gradient-to-r from-transparent via-gta-green/50 to-transparent" />
        </motion.div>
      </div>

      {/* Mission cards grid */}
      <div className="max-w-6xl mx-auto grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5 md:gap-6">
        {MISSIONS.map((mission, idx) => (
          <MissionCard key={mission.name} mission={mission} index={idx} />
        ))}
      </div>
    </section>
  );
}
