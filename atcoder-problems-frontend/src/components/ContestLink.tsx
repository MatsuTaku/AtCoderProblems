import React from "react";
import * as Url from "../utils/Url";
import Contest from "../interfaces/Contest";
import { NewTabLink } from "./NewTabLink";
import { AGC_001_START } from "../pages/TablePage/ContestClassifier";
import { getRatingColorClass } from "../utils";

interface Props {
  contest: Contest;
  title?: string;
}

enum RatedTargetType {
  All,
  Unrated
}

type RatedTarget = number | RatedTargetType;

function getRatedTarget(contest: Contest): RatedTarget {
  if (AGC_001_START > contest.start_epoch_second) {
    return RatedTargetType.Unrated;
  }
  switch (contest.rate_change) {
    case undefined:
      return RatedTargetType.Unrated;
    case "-":
      return RatedTargetType.Unrated;
    case "All":
      return RatedTargetType.All;
    case /\d+/.test(contest.rate_change) ? contest.rate_change : false: {
      const tmp = /\d+/.exec(contest.rate_change);
      if (tmp !== null) {
        return parseInt(tmp[0], 10);
      } else {
        return RatedTargetType.Unrated;
      }
    }
    default:
      return RatedTargetType.Unrated;
  }
}

function getColorClass(target: RatedTarget): string {
  if (target === RatedTargetType.All) {
    return "difficulty-red";
  }
  if (target === RatedTargetType.Unrated) {
    return "";
  }
  return getRatingColorClass(target);
}

const ContestLink: React.FC<Props> = props => {
  const { contest, title } = props;
  const target: RatedTarget = getRatedTarget(contest);

  return (
    <>
      <span className={getColorClass(target)}>◉</span>{" "}
      <NewTabLink href={Url.formatContestUrl(contest.id)}>
        {title !== undefined ? title : contest.title}
      </NewTabLink>
    </>
  );
};

export default ContestLink;
