export const EXCHANGE = 0;
export const QUEUE = 1;
export const PRODUCER = 2;
export const CONSUMER = 3;
export const ANON_EXCHANGE = 4;
export const STICKY_NOTE = 5;
export const NULL_NODE = -1;

export const DIRECT = 0;
export const FANOUT = 1;
export const TOPIC = 2;
export const ANON = 3;

export const SOURCE = 0;
export const DESTINATION = 1;

export const TOOLBAR_WIDTH = 60;
export const EDGE_STROKE = 2;
export const NODE_STROKE = 2;
export const LABEL_PADDING = 20;
export const Q_WIDTH = 44;
export const Q_HEIGHT = 22;
export const DEFAULT_BINDING_KEY = 'binding key';
export const ANON_X = 150;
export const ANON_Y = 20;
export const NODE_RADII = 16;

export const COLORS: Record<number, string> = {
  [EXCHANGE]: '#f97316',
  [QUEUE]: '#3b82f6',
  [PRODUCER]: '#10b981',
  [CONSUMER]: '#a855f7',
  [ANON_EXCHANGE]: '#334155',
};

export const BORDER_COLORS: Record<number, string> = {
  [EXCHANGE]: '#c2460a',
  [QUEUE]: '#1d4ed8',
  [PRODUCER]: '#047857',
  [CONSUMER]: '#6d28d9',
  [ANON_EXCHANGE]: '#0f172a',
};

export const EXCHANGE_TYPE_NAMES: Record<number, string> = {
  [DIRECT]: 'direct',
  [FANOUT]: 'fanout',
  [TOPIC]: 'topic',
  [ANON]: 'anon',
};

export const EXCHANGE_TYPE_FROM_NAME: Record<string, number> = {
  direct: DIRECT,
  fanout: FANOUT,
  topic: TOPIC,
  anon: ANON,
};

export const NODE_TYPE_NAMES: Record<number, string> = {
  [EXCHANGE]: 'exchange',
  [QUEUE]: 'queue',
  [PRODUCER]: 'producer',
  [CONSUMER]: 'consumer',
  [ANON_EXCHANGE]: 'anon_exchange',
};
