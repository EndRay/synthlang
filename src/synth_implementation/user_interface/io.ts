import {SoundNodeClassInfo} from "../../language/SoundNodeClassInfo";
import {
  UserInput as UserInputInfo,
  UserStereoInput as UserStereoInputInfo,
  UserOutput as UserOutputInfo,
  UserStereoOutput as UserStereoOutputInfo
} from "../../language/classes";
import {SoundNode} from "../SoundNode";

export class UserInput implements SoundNode {
  info = () => UserInputInfo;

  private value: number = 0;

  setValue(value: number): void {
    this.value = value;
  }

  calculateValue(_socketsValues: number[], outputValues: number[], indexToWrite: number): void {
    outputValues[indexToWrite] = this.value;
  }
}


export class UserStereoInput implements SoundNode {
  info = () => UserStereoInputInfo;

  private left: number = 0;
  private right: number = 0;

  setValue(left: number, right: number): void {
    this.left = left;
    this.right = right;
  }

  calculateValue(_socketsValues: number[], outputValues: number[], indexToWrite: number): void {
    outputValues[indexToWrite] = this.left;
    outputValues[indexToWrite + 1] = this.right;
  }
}

export class UserOutput implements SoundNode {
  info = () => UserOutputInfo;

  private input: number = 0;

  getValue(): number {
    return this.input;
  }

  calculateValue(socketsValues: number[], _outputValues: number[], _indexToWrite: number): void {
    this.input = socketsValues[0];
  }
}

export class UserStereoOutput implements SoundNode {
  info = () => UserStereoOutputInfo;

  private left: number = 0;
  private right: number = 0;

  getLeft(): number {
    return this.left;
  }
  getRight(): number {
    return this.right;
  }

  calculateValue(socketsValues: number[], _outputValues: number[], _indexToWrite: number): void {
    this.left = socketsValues[0];
    this.right = socketsValues[1];
  }
}