import { writeFile } from 'node:fs/promises';
import { faker } from '@faker-js/faker';

// ── Constants ────────────────────────────────────────────────────────────────

const STATIONS_COUNT = 50;

const CITIES = [
  'Tel Aviv',
  'Jerusalem',
  'Haifa',
  'Hadera',
  'Holon',
  'Ashdod',
  'Ashkelon',
  'Netanya',
  'Nahariya',
  'Beer Sheva',
];

const OWNERS = [
  'ElectroCharge Israel Ltd',
  'GreenDrive EV Solutions',
  'VoltPoint Networks',
  'SunCharge Energy',
  'EverGo Charging Co',
];

const CURRENCY_CODE = 'ILS';
const CURRENCY_NAME = 'Israeli New Shekel';

const MIN_RATE = 1.1;
const MAX_RATE = 3.9;
const RATE_STEP = 0.1;

const MIN_POWER_KW = 55;
const MAX_POWER_KW = 355;

// state weights: 1/10 INACTIVE, 2/10 OUT_OF_SERVICE, 7/10 ACTIVE
const STATE_WEIGHTS = [
  { weight: 1, value: 'INACTIVE' },
  { weight: 7, value: 'ACTIVE' },
  { weight: 2, value: 'OUT_OF_SERVICE' },
];

const PORT_STATUSES = ['DISABLED', 'FREE', 'BOOKED', 'OCCUPIED', 'ERROR'];

// ── Helpers ───────────────────────────────────────────────────────────────────

/** Returns a random rate that is a multiple of RATE_STEP between MIN_RATE and MAX_RATE. */
function randomRate() {
  const steps = Math.round((MAX_RATE - MIN_RATE) / RATE_STEP);
  const step = faker.number.int({ min: 0, max: steps });
  return Math.round((MIN_RATE + step * RATE_STEP) * 10) / 10;
}

/** Returns { peakRate, offPeakRate } where peakRate > offPeakRate. */
function randomRates() {
  let r1 = randomRate();
  let r2 = randomRate();
  while (r1 === r2) {
    r2 = randomRate();
  }
  return {
    peakRate: Math.max(r1, r2),
    offPeakRate: Math.min(r1, r2),
  };
}

/** Returns a 10-digit phone string starting with 0. */
function randomPhone() {
  return '0' + faker.string.numeric(9);
}

/** Returns the portsCount for a station based on its state. */
function portsCountForState(state) {
  if (state === 'ACTIVE') {
    return faker.helpers.arrayElement([3, 4, 5]);
  }
  if (state === 'INACTIVE') {
    return 0;
  }
  // OUT_OF_SERVICE: 0-5
  return faker.number.int({ min: 0, max: 5 });
}

/** Generates an array of port objects for a station. */
function generatePorts(count, createdAt, updatedAt) {
  return Array.from({ length: count }, (_, i) => ({
    portId: faker.string.uuid(),
    portCode: `PORT-${String.fromCharCode(65 + Math.floor(i / 9))}${(i % 9) + 1}`,
    status: faker.helpers.arrayElement(PORT_STATUSES),
    lastMeterKw: parseFloat(faker.number.float({ min: 0, max: 100, fractionDigits: 1 }).toFixed(1)),
    createdAt,
    updatedAt,
  }));
}

// ── Generator ─────────────────────────────────────────────────────────────────

function createRandomStation() {
  const city = faker.helpers.arrayElement(CITIES);
  const owner = faker.helpers.arrayElement(OWNERS);
  const state = faker.helpers.weightedArrayElement(STATE_WEIGHTS);
  const portsCount = portsCountForState(state);
  const { peakRate, offPeakRate } = randomRates();
  const createdAt = faker.date.past({ years: 3 }).toISOString();
  const updatedAt = faker.date.recent({ days: 90 }).toISOString();
  const ports = generatePorts(portsCount, createdAt, updatedAt);
  const hasFreePorts = ports.some((p) => p.status === 'FREE');

  return {
    id: faker.string.uuid(),
    code: faker.string.alphanumeric({ length: 10, casing: 'upper' }),
    name: `${city} ${faker.company.buzzNoun()} Charging Station`,
    owner,
    city,
    address: faker.location.streetAddress(),
    phone: randomPhone(),
    email: faker.internet.email(),
    siteTechnician: faker.person.fullName(),
    location: {
      latitude: faker.number.float({ min: 29.5, max: 33.3, fractionDigits: 6 }),
      longitude: faker.number.float({ min: 34.2, max: 35.9, fractionDigits: 6 }),
    },
    maxPowerKw: faker.number.int({ min: MIN_POWER_KW, max: MAX_POWER_KW, multipleOf: 5 }),
    portsCount,
    state,
    ratePlan: {
      currencyCode: CURRENCY_CODE,
      currencyName: CURRENCY_NAME,
      peakRate,
      offPeakRate,
    },
    createdAt,
    updatedAt,
    hasFreePorts,
    ports,
  };
}

function createRandomStations(n = STATIONS_COUNT) {
  return Array.from({ length: n }, createRandomStation);
}

// ── Main ──────────────────────────────────────────────────────────────────────

const stations = createRandomStations();
const data = JSON.stringify(stations, null, 2);

writeFile(new URL('./stations.json', import.meta.url), data, { encoding: 'utf8' })
  .then(() => console.log(`Written ${stations.length} stations to stations.json`))
  .catch((err) => console.error(err.message));
