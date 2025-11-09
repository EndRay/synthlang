import {SoundNodeClassInfo} from "../../language/SoundNodeClassInfo";

interface ClassDescriptionProps {
  classInfo: SoundNodeClassInfo;
  aliases: string[] | null;
  groupName: string;
}

export const ClassDescription = ({classInfo, aliases, groupName}: ClassDescriptionProps) => {
  const aliasesString =
    <>
      {aliases &&
          <> aliases: {
            aliases.map((alias, i) =>
              <>
                <span style={{color: `var(--class-color-${groupName}`}}>{alias}</span>
                {i < aliases.length - 1 && ", "}
              </>
            )} <br/>
          </>}
    </>;
  const socketsString = classInfo.sockets.length > 0 ?
    <>
      {classInfo.sockets.map((socket, i) =>
        <>
          <br/>
          - <span style={{color: `var(--socket-color)`}}>{typeof socket === "string" ? socket : socket[0]}</span>
          {typeof socket !== "string" && socket.length > 1 &&
              <> (aliases: {
                socket.slice(1).map((alias, j) =>
                  <>
                    <span style={{color: `var(--socket-color`}}>{alias}</span>
                    {j < socket.length - 2 && ", "}
                  </>
                )})
              </>}
        </>)
      }
    </> : <span style={{color: `var(--unused-color)`}}>none</span>;
  const outputsString = classInfo.outputs.length > 0 ?
    <>
      {classInfo.outputs.map((output, i) =>
        <>
          <br/>
          - <span style={{color: `var(--output-color)`}}>{typeof output === "string" ? output : output[0]}</span>
          {typeof output !== "string" && output.length > 1 &&
              <> (aliases: {
                output.slice(1).map((alias, j) =>
                  <>
                    <span style={{color: `var(--output-color`}}>{alias}</span>
                    {j < output.length - 2 && ", "}
                  </>
                )})
              </>}
        </>)
      }
    </> : <span style={{color: `var(--unused-color)`}}>none</span>;
  const constructorString = classInfo.positionalArgs && classInfo.positionalArgs.length > 0 ?
    <>
      {classInfo.positionalArgs.map((arg, i) =>
        <>
          <span style={{color: `var(--socket-color)`}}>{arg}</span>{i < classInfo.positionalArgs!.length - 1 && ", "}
        </>)
      }
    </> : <span style={{color: `var(--unused-color)`}}>always empty</span>;
  return <div className={"documentation-class-description-content"}>
    {aliasesString}
    sockets: {socketsString} <br/>
    outputs: {outputsString} <br/>
    constructor: {constructorString}
    {/*lorem ipsum dolor sit amet, consectetur adipiscing elit, sed do eiusmod tempor incididunt ut labore*/}
    {/*et dolore magna aliqua. Ut enim ad minim veniam, quis nostrud exercitation ullamco laboris nisi ut*/}
    {/*aliquip ex ea commodo consequat. Duis aute irure dolor in reprehenderit in voluptate velit esse*/}
    {/*cillum dolore eu fugiat nulla pariatur. Excepteur sint occaecat cupidatat non proident, sunt in*/}
    {/*culpa qui officia deserunt mollit anim id est laborum.*/}
  </div>
}