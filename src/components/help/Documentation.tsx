import {classesAlias, classesList} from "../../language/classes";
import "../../styles/documentation.css";
import {useEffect, useRef, useState} from "react";
import {SoundNodeClassInfo} from "../../language/SoundNodeClassInfo";
import {ClassDescription} from "./ClassDescription";

interface DocumentationProps {

}

export const Documentation = ({}: DocumentationProps) => {
  const [groupToClassNames, setGroupToClassNames] = useState<Map<string, string[]>>(new Map());
  const [classNameToAlias, setClassNameToAlias] = useState<Map<string, string[]>>(new Map());
  const [classNameToClassInfo, setClassNameToClassInfo] = useState<Map<string, SoundNodeClassInfo>>(new Map());

  const [expandedGroups, setExpandedGroups] = useState<Set<string>>(new Set());
  const [expandedClasses, setExpandedClasses] = useState<Set<string>>(new Set());

  useEffect(() => {
    const newGroupToClassNames = new Map<string, string[]>();
    const newClassNameToAlias = new Map<string, string[]>();
    const newClassNameToClassInfo = new Map<string, SoundNodeClassInfo>();
    for (const classInfo of classesList) {
      const classGroup = classInfo.classGroup ?? "Assorted";
      if (!newGroupToClassNames.has(classGroup)) {
        newGroupToClassNames.set(classGroup, []);
      }
      newGroupToClassNames.get(classGroup)!.push(classInfo.className);
      newClassNameToClassInfo.set(classInfo.className, classInfo);
    }
    for (const [alias, classInfo] of classesAlias.entries()) {
      if (!newClassNameToAlias.has(classInfo.className)) {
        newClassNameToAlias.set(classInfo.className, []);
      }
      newClassNameToAlias.get(classInfo.className)!.push(alias);
    }
    setGroupToClassNames(newGroupToClassNames);
    setClassNameToAlias(newClassNameToAlias);
    setClassNameToClassInfo(newClassNameToClassInfo);
    return () => {
      setGroupToClassNames(new Map());
      setClassNameToAlias(new Map());
      setClassNameToClassInfo(new Map());
    }
  }, []);

  const isGroupExpanded = (groupName: string) => {
    return expandedGroups.has(groupName);
  }
  const isClassExpanded = (className: string) => {
    return expandedClasses.has(className);
  }
  const changeGroupExpanded = (groupName: string) => {
    const newExpandedGroups = new Set(expandedGroups);
    if (newExpandedGroups.has(groupName)) {
      newExpandedGroups.delete(groupName);
      const newExpandedClasses = new Set(expandedClasses);
      for (const className of groupToClassNames.get(groupName) ?? []) {
        newExpandedClasses.delete(className);
      }
      setExpandedClasses(newExpandedClasses);
    } else {
      newExpandedGroups.add(groupName);
    }
    setExpandedGroups(newExpandedGroups);
  }
  const changeClassExpanded = (className: string) => {
    const newExpandedClasses = new Set(expandedClasses);
    if (newExpandedClasses.has(className)) {
      newExpandedClasses.delete(className);
    } else {
      newExpandedClasses.add(className);
    }
    setExpandedClasses(newExpandedClasses);
  }

  return <div className={"documentation-container"}>
    {[...groupToClassNames.entries()]
      .sort((a, b) => a[0].localeCompare(b[0]))
      .map(([groupName, classNames]) =>
      <div className={"documentation-group-container"} key={groupName}>

        <div className={`documentation-group-name ${isGroupExpanded(groupName) ? "current" : ""}`}
             onMouseDown={() => changeGroupExpanded(groupName)}>
          <div style={{
            backgroundColor: `var(--class-color-${groupName})`,
            width: 10,
            height: 10,
            borderRadius: 9999,
            marginRight: 8,
            display: "inline-block"
          }}></div>
          {groupName}
        </div>
        <div className={`documentation-class-list ${isGroupExpanded(groupName) ? "expanded" : ""}`}>
          {classNames
            .sort((a, b) => a[0].localeCompare(b[0]))
            .map(className =>
            <div className={"documentation-class-container"} key={className}>
              <div className={`documentation-class-name ${isClassExpanded(className) ? "current" : ""}`}
                   style={{color: `var(--class-color-${groupName})`}}
                   onMouseDown={() => changeClassExpanded(className)}>
                {className}
              </div>
              <div className={`documentation-class-description ${isClassExpanded(className) ? "expanded" : ""}`}>
                <ClassDescription
                  classInfo={classNameToClassInfo.get(className)!}
                  aliases={classNameToAlias.get(className) ?? null}
                  groupName={groupName}
                />
              </div>
            </div>
          )}
        </div>
      </div>
    )}
  </div>
}