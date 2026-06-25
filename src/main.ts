import { Simulator } from './Simulator';
import { UI } from './UI';

const sim = new Simulator('Simulator');
const ui = new UI(sim);

(window as unknown as Record<string, unknown>).sim = sim;
