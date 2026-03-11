/**
 * App API client — standalone (no Base44 dependency).
 * Re-exports auth, entities, and integrations for backward compatibility.
 */
import { auth } from './auth';
import * as entities from './entities';
import * as integrations from './integrations';

export { auth, entities, integrations };
