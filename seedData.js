const phaseSeed = [
  {
    slug: 'start-here',
    title: 'Start Here',
    description: 'Sim setup, controls, graphics, and baseline prerequisites before IQT.',
    order: 0,
    paths: [
      {
        slug: 'sim-setup',
        title: 'Sim Setup Fundamentals',
        description: 'Get your hardware, controls, and environment ready for training.',
        order: 0,
        items: [
          {
            title: 'DCS Beginner Setup Guide',
            description: 'Walkthrough for initial DCS setup and graphics optimization.',
            contentType: 'video',
            difficulty: 'beginner',
            duration: '18:00',
            externalUrl: 'https://www.youtube.com/results?search_query=dcs+beginner+setup+guide',
            status: 'published'
          }
        ]
      }
    ]
  },
  {
    slug: 'iqt',
    title: 'Initial Qualification Training',
    description: 'Learn foundational aircraft operation, airmanship, and formation discipline.',
    order: 1,
    paths: [
      {
        slug: 'ground-pattern',
        title: 'Ground & Pattern Procedures',
        description: 'Ground ops, overhead pattern, and landing fundamentals.',
        order: 0,
        items: [
          {
            title: 'DCS Hacks — USAF Ground Procedures 2024',
            description: 'Taxi, runway, and takeoff procedures from a retired USAF pilot.',
            contentType: 'video',
            difficulty: 'beginner',
            duration: '24:27',
            externalUrl: 'https://www.youtube.com/watch?v=PglWiCOOxzk',
            status: 'published'
          },
          {
            title: 'How the Military Overhead Pattern Works',
            description: 'USAF overhead pattern and recovery flow.',
            contentType: 'video',
            difficulty: 'beginner',
            duration: '9:21',
            externalUrl: 'https://www.youtube.com/watch?v=nQr08oqpGkQ',
            status: 'published'
          }
        ]
      },
      {
        slug: 'basic-flight',
        title: 'Basic Flight Fundamentals',
        description: 'Pitch, power, energy, and early stick-and-rudder competency.',
        order: 1,
        items: [
          {
            title: 'Basic Flight Course — Lesson 1',
            description: 'Core aircraft control and maneuvering foundation.',
            contentType: 'video',
            difficulty: 'beginner',
            duration: '26:11',
            externalUrl: 'https://www.youtube.com/watch?v=t51w9IcdAsY',
            status: 'published'
          },
          {
            title: 'Basic Flight Course — Lesson 2',
            description: 'Builds on lesson 1 for stronger fundamentals.',
            contentType: 'video',
            difficulty: 'beginner',
            duration: '26:07',
            externalUrl: 'https://www.youtube.com/watch?v=qzhSWr0W3U0',
            status: 'published'
          }
        ]
      },
      {
        slug: 'formation',
        title: 'Formation Flying',
        description: 'Formation geometry, position keeping, and lead/wingman roles.',
        order: 2,
        items: [
          {
            title: 'Fundamentals of Formation Flying — 3 and 4-Plane',
            description: 'Still-relevant formation principles from USAF training material.',
            contentType: 'video',
            difficulty: 'beginner',
            duration: '25:17',
            externalUrl: 'https://www.youtube.com/watch?v=91sBXQCwP08',
            status: 'published'
          },
          {
            title: 'T-6 Tactical Formation',
            description: 'USAF UPT tactical formation perspective from Vance AFB.',
            contentType: 'video',
            difficulty: 'intermediate',
            duration: '38:05',
            externalUrl: 'https://www.youtube.com/watch?v=w4loyZh3WVg',
            status: 'published'
          }
        ]
      }
    ]
  },
  {
    slug: 'mqt',
    title: 'Mission Qualification Training',
    description: 'Navigation under load, tactical comms, and mission execution.',
    order: 2,
    paths: []
  },
  {
    slug: 'bfm',
    title: 'BFM & Air-to-Air',
    description: '1v1, intercept geometry, and air-to-air tactical decision making.',
    order: 3,
    paths: []
  },
  {
    slug: 'strike',
    title: 'Strike & SEAD',
    description: 'Air-to-ground planning, weapons employment, and SEAD workflow.',
    order: 4,
    paths: []
  },
  {
    slug: 'cas',
    title: 'Close Air Support',
    description: 'JTAC coordination, 9-lines, and dynamic CAS operations.',
    order: 5,
    paths: []
  }
];

module.exports = { phaseSeed };
