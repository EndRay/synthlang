import {SynthStructure} from "../language/SynthStructure";
import {CLASS_NAME_TO_SOUND_NODE_CONSTRUCTOR, SoundNode} from "./SoundNode";
import {UserInput, UserOutput, UserStereoOutput} from "./user_interface/io";
import {
  convertConstant,
  fromCents,
  fromDecibels,
  fromHertz,
  fromHours,
  fromMilliseconds,
  fromMinutes,
  fromSeconds,
  fromSemitones, toHertz
} from "./conversions";
import {GLOBAL_BUILTIN, VOICE_BUILTIN} from "../language/builtin";

const VOICE_RELEASED = 0;
const VOICE_PRESSED = 1;

type VoiceState = typeof VOICE_RELEASED | typeof VOICE_PRESSED;

export class Synth {
  private readonly recalculationOrder: number[];

  private readonly objectOutputIndex: number[] = []; // [objectIndex] -> outputValuesIndex of first output
  private readonly objectsArgs: number[][][]; // [objectIndex][socketIndex][mixIndex] -> outputValuesIndex
  private readonly outputValues: number[]; // [outputValuesIndex] -> value
  private readonly args = new Array<number>(16);

  private readonly gateInput: UserInput;
  private readonly triggerInput: UserInput;
  private readonly pitchInput: UserInput;
  private readonly velocityInput: UserInput;

  private readonly voiceGateInputs: UserInput[] = [];
  private readonly voiceTriggerInputs: UserInput[] = [];
  private readonly voicePitchInputs: UserInput[] = [];
  private readonly voiceVelocityInputs: UserInput[] = [];

  private objects: SoundNode[] = [];

  private noteToVoice: { [midiNote: number]: number } = {};
  private voiceState: VoiceState[] = [];
  private voiceTiming: number[] = [];

  constructor(synthStructure: SynthStructure, voicesCount: number) {
    this.objectsArgs = [];

    let outputValuesLength = 0;
    let uniqueIdCounter = 0;
    let voicesIdCounter = 0;

    let uniqueIdToVoiceId: { [uniqueId: number]: number } = {};

    for (const object of synthStructure.objects) {
      if (!(object.className in CLASS_NAME_TO_SOUND_NODE_CONSTRUCTOR)) {
        throw new Error(`Sound node class "${object.className}" not registered.`);
      }
      const instances = object.perVoice ? voicesCount : 1;
      uniqueIdToVoiceId[uniqueIdCounter] = voicesIdCounter;
      uniqueIdCounter++;
      for (let instId = 0; instId < instances; instId++) {
        const soundNode = CLASS_NAME_TO_SOUND_NODE_CONSTRUCTOR[object.className]()
        this.objects.push(soundNode);
        this.objectOutputIndex.push(outputValuesLength);
        outputValuesLength += soundNode.info().outputs.length;
        voicesIdCounter++;
      }
    }

    const constants: number[] = [];

    for (const object of synthStructure.objects) {
      const soundNodeInfo = CLASS_NAME_TO_SOUND_NODE_CONSTRUCTOR[object.className]().info()

      const instances = object.perVoice ? voicesCount : 1;
      const firstConstantIndex = outputValuesLength + constants.length;
      for (let instId = 0; instId < instances; instId++) {
        const objectArgs: number[][] = [];
        let constantIndex = 0;
        for (const socket of soundNodeInfo.sockets) {
          let socketName: string;
          if (typeof socket === "string") {
            socketName = socket;
          } else {
            socketName = socket[0];
          }
          const socketArgs: number[] = [];
          for (const expr of object.socketMixes.get(socketName)!) {
            switch (expr.type) {
              case "ObjectOutput": {
                const outputName = expr.outputName;
                const exprClassName = synthStructure.objects[expr.objectId].className;
                const exprInfo = CLASS_NAME_TO_SOUND_NODE_CONSTRUCTOR[exprClassName]().info(); // TODO: make in a different way
                const outputIndex = exprInfo.outputs.findIndex(o => {
                  if (typeof o === "string") {
                    return o === outputName;
                  } else {
                    return o.includes(outputName);
                  }
                });
                const isConnectedObjectPerVoice = synthStructure.objects[expr.objectId].perVoice;
                const connections = !object.perVoice && isConnectedObjectPerVoice ? voicesCount : 1;
                for (let v = 0; v < connections; v++) {
                  const socketObjectId = uniqueIdToVoiceId[expr.objectId] + (isConnectedObjectPerVoice ? instId : 0) + v;
                  socketArgs.push(this.objectOutputIndex[socketObjectId] + outputIndex);
                }
                break;
              }
              case "ConstantNumber": {
                if (instId === 0) {
                  const value = convertConstant(expr);
                  constants.push(value);
                }
                socketArgs.push(firstConstantIndex + constantIndex);
                constantIndex++;
              }
            }
          }
          objectArgs.push(socketArgs);
        }
        this.objectsArgs.push(objectArgs);
      }
    }

    this.outputValues = new Array(outputValuesLength + constants.length).fill(0);
    for (let i = 0; i < constants.length; i++) {
      this.outputValues[outputValuesLength + i] = constants[i];
    }

    this.recalculationOrder = []
    for (const objectId of synthStructure.recalculationOrder) {
      const object = synthStructure.objects[objectId];
      const instances = object.perVoice ? voicesCount : 1;
      for (let instId = 0; instId < instances; instId++) {
        this.recalculationOrder.push(uniqueIdToVoiceId[objectId] + instId);
      }
    }

    const voiceTId = uniqueIdToVoiceId[
    synthStructure.userInputNames.length + synthStructure.userOutputNames.length +
    synthStructure.userPerVoiceInputNames.indexOf("voiceT")];

    for (let v = 0; v < voicesCount; v++) {
      const voiceT = voicesCount === 1 ? 0 : v / (voicesCount - 1);
      const voiceTObj = this.objects[voiceTId + v] as UserInput;
      voiceTObj.setValue(voiceT);
      console.log(voiceT);
      voiceTObj.calculateValue([], this.outputValues, this.objectOutputIndex[voiceTId + v]);
    }

    this.gateInput = this.objects[synthStructure.userInputNames.indexOf("gate")] as UserInput;
    this.triggerInput = this.objects[synthStructure.userInputNames.indexOf("trigger")] as UserInput;
    this.pitchInput = this.objects[synthStructure.userInputNames.indexOf("pitch")] as UserInput;
    this.velocityInput = this.objects[synthStructure.userInputNames.indexOf("velocity")] as UserInput;

    const perVoiceInputsOffset = synthStructure.userInputNames.length + synthStructure.userOutputNames.length;
    for(let v = 0; v < voicesCount; v++) {
      const gateInputPos = perVoiceInputsOffset + synthStructure.userPerVoiceInputNames.indexOf("gate");
      const triggerInputPos = perVoiceInputsOffset + synthStructure.userPerVoiceInputNames.indexOf("trigger");
      const pitchInputPos = perVoiceInputsOffset + synthStructure.userPerVoiceInputNames.indexOf("pitch");
      const velocityInputPos = perVoiceInputsOffset + synthStructure.userPerVoiceInputNames.indexOf("velocity");
      this.voiceGateInputs.push(this.objects[uniqueIdToVoiceId[gateInputPos] + v] as UserInput);
      this.voiceTriggerInputs.push(this.objects[uniqueIdToVoiceId[triggerInputPos] + v] as UserInput);
      this.voicePitchInputs.push(this.objects[uniqueIdToVoiceId[pitchInputPos] + v] as UserInput);
      this.voiceVelocityInputs.push(this.objects[uniqueIdToVoiceId[velocityInputPos] + v] as UserInput);
    }

    for(let v = 0; v < voicesCount; v++) {
      this.voiceState.push(VOICE_RELEASED);
      this.voiceTiming.push(0);
    }

    console.log(this.recalculationOrder);
    console.log(this.objects);
    console.log(this.objectOutputIndex);
    console.log(this.objectsArgs);
    console.log(this.outputValues);
  }

  pressNote(midiNote: number, velocity: number): void {
    this.gateInput.setValue(1);
    this.triggerInput.setValue(1);
    this.pitchInput.setValue(Synth.noteToPitch(midiNote));
    this.velocityInput.setValue(velocity);

    let voiceToUse: number | null = null;
    if(midiNote in this.noteToVoice) {
      voiceToUse = this.noteToVoice[midiNote];
    }
    else {
      let bestVoice: number = 0;
      let bestVoiceState: VoiceState = this.voiceState[bestVoice];
      let bestVoiceTiming: number = this.voiceTiming[bestVoice];
      for(let v = 1; v < this.voiceState.length; v++) {
        const voiceState = this.voiceState[v];
        const voiceTiming = this.voiceTiming[v];
        if(voiceState < bestVoiceState){
          bestVoice = v;
          bestVoiceState = voiceState;
          bestVoiceTiming = voiceTiming;
          break;
        }
        if(voiceState === bestVoiceState && voiceTiming < bestVoiceTiming) {
          bestVoice = v;
          bestVoiceState = voiceState;
          bestVoiceTiming = voiceTiming;
        }
      }
      voiceToUse = bestVoice;
    }

    console.log(`Using voice ${voiceToUse} for note ${midiNote}`);

    this.voiceState[voiceToUse] = VOICE_PRESSED;
    this.voiceTiming[voiceToUse] = performance.now();
    this.noteToVoice[midiNote] = voiceToUse;

    this.voiceGateInputs[voiceToUse].setValue(1);
    this.voiceTriggerInputs[voiceToUse].setValue(1);
    this.voicePitchInputs[voiceToUse].setValue(Synth.noteToPitch(midiNote));
    this.voiceVelocityInputs[voiceToUse].setValue(velocity);
  }

  releaseNote(midiNote: number, releaseVelocity: number): void {
    this.gateInput.setValue(0);
    // TODO: use releaseVelocity

    if(midiNote in this.noteToVoice) {
      const voiceToUse = this.noteToVoice[midiNote];
      this.voiceState[voiceToUse] = VOICE_RELEASED;
      this.voiceTiming[voiceToUse] = performance.now();

      this.voiceGateInputs[voiceToUse].setValue(0);

      delete this.noteToVoice[midiNote];
    }
  }

  releaseAllNotes(): void {
    this.gateInput.setValue(0);

    for(const midiNote in this.noteToVoice) {
      const voiceToUse = this.noteToVoice[midiNote];
      this.voiceState[voiceToUse] = VOICE_RELEASED;
      this.voiceTiming[voiceToUse] = performance.now();

      this.voiceGateInputs[voiceToUse].setValue(0);
    }
    this.noteToVoice = {};
  }

  getSamples(sampleCount: number): Float32Array {
    const objects = this.objects;
    const outputValues = this.outputValues;
    const objectsArgs = this.objectsArgs;
    const objectOutputIndex = this.objectOutputIndex;
    const recalculationOrder = this.recalculationOrder;
    const args = this.args;

    const outputObjectIndex = recalculationOrder[recalculationOrder.length - 1];
    const output: UserStereoOutput = objects[outputObjectIndex] as UserStereoOutput;

    const recalculationOrderLength = recalculationOrder.length;

    const chunk = new Float32Array(sampleCount * 2);

    for (let i = 0; i < sampleCount; i++) {
      this.triggerInput.setValue(0);
      for (let j = 0; j < recalculationOrderLength; j++) {
        const objectIndex = recalculationOrder[j];
        const object = objects[objectIndex];
        const objectArgs = objectsArgs[objectIndex];
        const objectArgsLength = objectArgs.length;

        for (let k = 0; k < objectArgsLength; k++) {
          const socketArgs = objectArgs[k];
          const socketArgsLength = socketArgs.length;
          let sum = 0;
          for (let l = 0; l < socketArgsLength; l++) {
            sum += outputValues[socketArgs[l]];
          }
          args[k] = sum;
        }

        const indexToWrite = objectOutputIndex[objectIndex];
        object.calculateValue(args, outputValues, indexToWrite);
      }
      chunk[i * 2] = output.getLeft();
      chunk[i * 2 + 1] = output.getRight();
    }
    return chunk;
  }

  private static noteToPitch(midiNote: number): number {
    return fromHertz(440 * Math.pow(2, (midiNote - 69) / 12));
  }
}