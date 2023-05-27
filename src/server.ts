/**
 * @name server
 *
 * @description The entry point for the app
 */

import app from "./app";
import { secretUtil } from './utils/secretutil';

// // start listening to server on specified port
try {
  ((port = secretUtil.PORT || 3001) => {
    app.server.listen(port, () => console.log(`> Listening on port ${port}`));
  })();
} catch (error) {
  console.log(error)
}
