import { ObjectSyncClient } from "../src/client";
import { expose } from "../src/devUtils"

const client = new ObjectSyncClient('ws://localhost:8765');

expose('c', client);