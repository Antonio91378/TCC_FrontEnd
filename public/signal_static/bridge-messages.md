Static pages use C# bridge messaging for IO. Message schema (JSON over Vuplex):

Outgoing from JS to C#
- type: "readBool"
  payload: { key: string }
  desc: Request current boolean value for a key (e.g., "bool")

- type: "writeBool"
  payload: { key: string, value: boolean }
  desc: Write boolean value

- type: "readNumber"
  payload: { key: string }
  desc: Request current numeric value for a key (e.g., "sp")

- type: "writeNumber"
  payload: { key: string, value: number }
  desc: Write numeric value

Incoming from C# to JS
- type: "valueBool"
  payload: { key: string, value: boolean, t?: number }

- type: "valueNumber"
  payload: { key: string, value: number, t?: number }

Notes:
- Host app must subscribe to messages and respond accordingly (Firebase / OPC UA / other sources).
- For polling, C# can push periodically, or JS can send read* requests on intervals.
