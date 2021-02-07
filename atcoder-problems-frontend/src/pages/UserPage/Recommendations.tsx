import React, { useState } from "react";
import {
  BootstrapTable,
  SelectRow,
  SelectRowMode,
  TableHeaderColumn,
} from "react-bootstrap-table";
import { List, Map as ImmutableMap } from "immutable";
import {
  Button,
  ButtonGroup,
  CustomInput,
  DropdownItem,
  DropdownMenu,
  DropdownToggle,
  Row,
  UncontrolledDropdown,
} from "reactstrap";
import { useHistory } from "react-router-dom";
import { isAccepted } from "../../utils";
import * as Url from "../../utils/Url";
import Submission from "../../interfaces/Submission";
import Problem from "../../interfaces/Problem";
import Contest from "../../interfaces/Contest";
import ProblemModel, {
  isProblemModelWithDifficultyModel,
  isProblemModelWithTimeModel,
} from "../../interfaces/ProblemModel";
import { RatingInfo } from "../../utils/RatingInfo";
import {
  formatPredictedSolveProbability,
  formatPredictedSolveTime,
  predictSolveProbability,
  predictSolveTime,
} from "../../utils/ProblemModelUtil";
import { HelpBadgeTooltip } from "../../components/HelpBadgeTooltip";
import { ProblemLink } from "../../components/ProblemLink";
import { ContestLink } from "../../components/ContestLink";
import { NewTabLink } from "../../components/NewTabLink";
import { ProblemId } from "../../interfaces/Status";
import { PROBLEMID_SEPARATE_SYMBOL } from "../../utils/QueryString";

const ExcludeOptions = [
  "Exclude",
  "Exclude submitted",
  "1 Week",
  "2 Weeks",
  "4 Weeks",
  "6 Months",
  "Don't exclude",
] as const;
type ExcludeOption = typeof ExcludeOptions[number];

const formatExcludeOption = (excludeOption: ExcludeOption): string => {
  switch (excludeOption) {
    case "1 Week":
      return "Exclude problems solved in last 7 days.";
    case "2 Weeks":
      return "Exclude problems solved in last 2 weeks.";
    case "4 Weeks":
      return "Exclude problems solved in last 4 weeks";
    case "6 Months":
      return "Exclude problems solved in last 6 months";
    case "Exclude":
      return "Exclude all the solved problems";
    case "Don't exclude":
      return "Don't exclude solved problems.";
    case "Exclude submitted":
      return "Exclude all the submitted problems";
  }
};

const isIncluded = (
  problemId: string,
  excludeOption: ExcludeOption,
  currentSecond: number,
  lastSolvedTimeMap: Map<ProblemId, number>
): boolean => {
  const lastSolvedTime = lastSolvedTimeMap.get(problemId);
  if (lastSolvedTime) {
    const seconds = currentSecond - lastSolvedTime;
    switch (excludeOption) {
      case "Exclude":
      case "Exclude submitted":
        return false;
      case "1 Week":
        return seconds > 3600 * 24 * 7;
      case "2 Weeks":
        return seconds > 3600 * 24 * 14;
      case "4 Weeks":
        return seconds > 3600 * 24 * 28;
      case "6 Months":
        return seconds > 3600 * 24 * 180;
      case "Don't exclude":
        return true;
    }
  } else {
    return true;
  }
};

const excludeSubmittedProblem = (
  problemId: ProblemId,
  excludeOption: ExcludeOption,
  submitted: Set<ProblemId>
): boolean => {
  switch (excludeOption) {
    case "Exclude submitted":
      return !submitted.has(problemId);
    default:
      return true;
  }
};

const RECOMMEND_NUM_OPTIONS = [
  {
    text: "10",
    value: 10,
  },
  {
    text: "20",
    value: 20,
  },
  {
    text: "50",
    value: 50,
  },
  {
    text: "100",
    value: 100,
  },
  {
    text: "All",
    value: Number.POSITIVE_INFINITY,
  },
];

const RecommendOptions = ["Easy", "Moderate", "Difficult"] as const;
type RecommendOption = typeof RecommendOptions[number];

const getRecommendProbability = (option: RecommendOption): number => {
  switch (option) {
    case "Easy":
      return 0.8;
    case "Moderate":
      return 0.5;
    case "Difficult":
      return 0.2;
    default:
      return 0.0;
  }
};

const getRecommendProbabilityRange = (
  option: RecommendOption
): { lowerBound: number; upperBound: number } => {
  switch (option) {
    case "Easy":
      return {
        lowerBound: 0.5,
        upperBound: Number.POSITIVE_INFINITY,
      };
    case "Moderate":
      return {
        lowerBound: 0.2,
        upperBound: 0.8,
      };
    case "Difficult":
      return {
        lowerBound: Number.NEGATIVE_INFINITY,
        upperBound: 0.5,
      };
    default:
      return {
        lowerBound: Number.NEGATIVE_INFINITY,
        upperBound: Number.POSITIVE_INFINITY,
      };
  }
};

interface RecommendationFilter {
  recommendOption: RecommendOption;
  excludeOption: ExcludeOption;
  recommendExperimental: boolean;
  recommendNum: number;
}

interface FilterBarProps extends RecommendationFilter {
  readonly setRecommendOption: (type: RecommendOption) => void;
  readonly setExcludeOption: (option: ExcludeOption) => void;
  readonly setRecommendExperimental: (recommend: boolean) => void;
  readonly setRecommendNum: (num: number) => void;
}

const RecommendationsFilterBar: React.FC<FilterBarProps> = (props) => {
  const {
    recommendOption,
    setRecommendOption,
    excludeOption,
    setExcludeOption,
    recommendExperimental,
    setRecommendExperimental,
    recommendNum,
    setRecommendNum,
  } = props;
  return (
    <Row className="my-3 d-flex justify-content-between">
      <div>
        <ButtonGroup className="mr-3">
          {RecommendOptions.map((type) => (
            <Button
              key={type}
              active={recommendOption === type}
              onClick={(): void => setRecommendOption(type)}
            >
              {type}
            </Button>
          ))}
        </ButtonGroup>
        <ButtonGroup className="mr-3">
          <UncontrolledDropdown>
            <DropdownToggle caret>
              {formatExcludeOption(excludeOption)}
            </DropdownToggle>
            <DropdownMenu>
              {ExcludeOptions.map((option) => (
                <DropdownItem
                  key={option}
                  onClick={(): void => setExcludeOption(option)}
                >
                  {formatExcludeOption(option)}
                </DropdownItem>
              ))}
            </DropdownMenu>
          </UncontrolledDropdown>
        </ButtonGroup>
        <CustomInput
          type="switch"
          id="switchRecommendExperimental"
          inline
          label={
            <span role="img" aria-label="experimental">
              🧪
            </span>
          }
          checked={recommendExperimental}
          onChange={() => setRecommendExperimental(!recommendExperimental)}
        />
      </div>
      <UncontrolledDropdown direction="left">
        <DropdownToggle caret>
          {recommendNum === Number.POSITIVE_INFINITY ? "All" : recommendNum}
        </DropdownToggle>
        <DropdownMenu>
          {RECOMMEND_NUM_OPTIONS.map(({ text, value }) => (
            <DropdownItem
              key={value}
              onClick={(): void => setRecommendNum(value)}
            >
              {text}
            </DropdownItem>
          ))}
        </DropdownMenu>
      </UncontrolledDropdown>
    </Row>
  );
};

type ProblemIdSetActionType = "ADD" | "DELETE";
interface ProblemIdSetAction {
  type: ProblemIdSetActionType;
  ids?: ProblemId[];
}
const problemIdSetInit = () => new Set<ProblemId>();
const problemIdSetReducer = (
  state: Set<ProblemId>,
  action: ProblemIdSetAction
): Set<ProblemId> => {
  switch (action.type) {
    case "ADD": {
      if (action.ids) {
        const newSet = new Set(state);
        for (const id of action.ids) {
          newSet.add(id);
        }
        return newSet;
      }
      return state;
    }
    case "DELETE": {
      if (action.ids) {
        const newSet = new Set(state);
        for (const id of action.ids) {
          newSet.delete(id);
        }
        return newSet;
      }
      return state;
    }
  }
};

interface TableProps {
  readonly recommendedProblems: RecommendedProblem[];
  readonly contests: ImmutableMap<string, Contest>;
  readonly problemModels: ImmutableMap<string, ProblemModel>;
  readonly userRatingInfo: RatingInfo;
  readonly isLoggedIn?: boolean;
}

const RecommendationsTable: React.FC<TableProps> = (props) => {
  const {
    recommendedProblems,
    contests,
    problemModels,
    userRatingInfo,
  } = props;

  const history = useHistory();

  const [selectedProblemIdSet, selectedProblemIdSetDispatch] = React.useReducer(
    problemIdSetReducer,
    problemIdSetInit()
  );
  const selectProblemIds = (ids: ProblemId[]) =>
    selectedProblemIdSetDispatch({ type: "ADD", ids: ids });
  const deselectProblemIds = (ids: ProblemId[]) =>
    selectedProblemIdSetDispatch({ type: "DELETE", ids: ids });

  const selectedProblemIds = Array.from(selectedProblemIdSet);
  interface HasProblemId {
    id: ProblemId;
  }
  const selectRowProps = !props.isLoggedIn
    ? undefined
    : ({
        mode: "checkbox" as SelectRowMode,
        selected: selectedProblemIds,
        onSelect: (row: HasProblemId, isSelected) => {
          if (isSelected) {
            selectProblemIds([row.id]);
          } else {
            deselectProblemIds([row.id]);
          }
        },
        onSelectAll: (isSelected, rows: HasProblemId[]) => {
          const ids = rows.map(({ id }) => id);
          if (isSelected) {
            selectProblemIds(ids);
          } else {
            deselectProblemIds(ids);
          }
          return Array.from(selectedProblemIdSet);
        },
      } as SelectRow);
  const problemIdToString = selectedProblemIds.join(PROBLEMID_SEPARATE_SYMBOL);
  const createContestLocation = {
    pathname: "/contest/create",
    search: !problemIdToString ? "" : "?problemIds=" + problemIdToString,
  };

  return (
    <>
      {props.isLoggedIn && (
        <Row>
          <ButtonGroup>
            <Button
              color="success"
              disabled={selectedProblemIdSet.size == 0}
              onClick={() => {
                history.push(createContestLocation);
              }}
            >
              Create Virtual Contest
            </Button>
          </ButtonGroup>
        </Row>
      )}
      <Row className="my-3">
        <BootstrapTable
          data={recommendedProblems}
          keyField="id"
          height="auto"
          hover
          striped
          selectRow={selectRowProps}
        >
          <TableHeaderColumn
            dataField="title"
            dataFormat={(
              title: string,
              {
                id,
                contest_id,
                is_experimental,
              }: { id: string; contest_id: string; is_experimental: boolean }
            ): React.ReactElement => (
              <ProblemLink
                isExperimentalDifficulty={is_experimental}
                showDifficulty={true}
                problemId={id}
                problemTitle={title}
                contestId={contest_id}
                problemModel={problemModels.get(id, null)}
                userRatingInfo={userRatingInfo}
              />
            )}
          >
            Problem
          </TableHeaderColumn>
          <TableHeaderColumn
            dataField="contest_id"
            dataFormat={(
              contestId: string,
              problem: Problem
            ): React.ReactElement => {
              const contest = contests.get(contestId);
              return contest ? (
                <ContestLink contest={contest} />
              ) : (
                <NewTabLink href={Url.formatContestUrl(problem.contest_id)}>
                  {contestId}
                </NewTabLink>
              );
            }}
          >
            Contest
          </TableHeaderColumn>
          <TableHeaderColumn
            dataField="difficulty"
            dataFormat={(difficulty: number | null): string => {
              if (difficulty === null) {
                return "-";
              }
              return String(difficulty);
            }}
          >
            <span>Difficulty</span>
            &nbsp;
            <HelpBadgeTooltip id="difficulty">
              Internal rating to have 50% Solve Probability
            </HelpBadgeTooltip>
          </TableHeaderColumn>
          <TableHeaderColumn
            dataField="predictedSolveProbability"
            dataFormat={formatPredictedSolveProbability}
          >
            <span>Solve Probability</span>
            &nbsp;
            <HelpBadgeTooltip id="probability">
              Estimated probability that you could solve this problem if you
              competed in the contest.
            </HelpBadgeTooltip>
          </TableHeaderColumn>
          <TableHeaderColumn
            dataField="predictedSolveTime"
            dataFormat={formatPredictedSolveTime}
          >
            <span>Median Solve Time</span>
            &nbsp;
            <HelpBadgeTooltip id="solvetime">
              Estimated time required to solve this problem.
            </HelpBadgeTooltip>
          </TableHeaderColumn>
        </BootstrapTable>
      </Row>
    </>
  );
};

interface RecommendedProblem extends Problem {
  difficulty: number | undefined;
  is_experimental: boolean;
  predictedSolveTime: number | null;
  predictedSolveProbability: number;
}

class RecommendedProblemsGenerator {
  problems: List<Problem>;
  lastSolvedTimeMap: Map<ProblemId, number>;
  submittedSet: Set<string>;
  problemModels: ImmutableMap<string, ProblemModel>;
  userRatingInfo: RatingInfo;

  constructor(
    problems: List<Problem>,
    userSubmissions: Submission[],
    problemModels: ImmutableMap<string, ProblemModel>,
    userRatingInfo: RatingInfo
  ) {
    this.problems = problems;
    this.lastSolvedTimeMap = new Map<ProblemId, number>();
    userSubmissions
      .filter((s) => isAccepted(s.result))
      .forEach((s) => {
        const cur = this.lastSolvedTimeMap.get(s.problem_id) ?? 0;
        this.lastSolvedTimeMap.set(s.problem_id, Math.max(s.epoch_second, cur));
      });
    this.submittedSet = new Set(userSubmissions.map((s) => s.problem_id));
    this.problemModels = problemModels;
    this.userRatingInfo = userRatingInfo;
  }

  filtered(filter: RecommendationFilter) {
    const {
      recommendOption,
      excludeOption,
      recommendExperimental,
      recommendNum,
    } = filter;

    const currentSecond = Math.floor(new Date().getTime() / 1000);
    const recommendingProbability = getRecommendProbability(recommendOption);
    const recommendingRange = getRecommendProbabilityRange(recommendOption);

    return this.problems
      .filter((p) =>
        isIncluded(p.id, excludeOption, currentSecond, this.lastSolvedTimeMap)
      )
      .filter((p) =>
        excludeSubmittedProblem(p.id, excludeOption, this.submittedSet)
      )
      .filter((p) => this.problemModels.has(p.id))
      .map((p) => ({
        ...p,
        difficulty: this.problemModels.get(p.id)?.difficulty,
        is_experimental: this.problemModels.get(p.id)?.is_experimental ?? false,
      }))
      .filter((p) => p.difficulty !== undefined)
      .filter((p) => recommendExperimental || !p.is_experimental)
      .map((p) => {
        const internalRating = this.userRatingInfo.internalRating;
        let predictedSolveTime: number | null;
        let predictedSolveProbability: number;
        if (internalRating === null) {
          predictedSolveTime = null;
          predictedSolveProbability = -1;
        } else {
          const problemModel: ProblemModel | undefined = this.problemModels.get(
            p.id
          );
          if (isProblemModelWithTimeModel(problemModel)) {
            predictedSolveTime = predictSolveTime(problemModel, internalRating);
          } else {
            predictedSolveTime = null;
          }
          if (isProblemModelWithDifficultyModel(problemModel)) {
            predictedSolveProbability = predictSolveProbability(
              problemModel,
              internalRating
            );
          } else {
            predictedSolveProbability = -1;
          }
        }
        return { ...p, predictedSolveTime, predictedSolveProbability };
      })
      .filter(
        (p) =>
          recommendingRange.lowerBound <= p.predictedSolveProbability &&
          p.predictedSolveProbability < recommendingRange.upperBound
      )
      .sort((a, b) => {
        const da = Math.abs(
          a.predictedSolveProbability - recommendingProbability
        );
        const db = Math.abs(
          b.predictedSolveProbability - recommendingProbability
        );
        return da - db;
      })
      .slice(0, recommendNum)
      .sort((a, b) => (b.difficulty ?? 0) - (a.difficulty ?? 0))
      .toArray();
  }
}

interface CommonProps {
  readonly contests: ImmutableMap<string, Contest>;
  readonly problemModels: ImmutableMap<string, ProblemModel>;
  readonly userRatingInfo: RatingInfo;
  readonly isLoggedIn?: boolean;
}

interface InnerProps extends CommonProps {
  readonly recommendedProblemsGenerator: RecommendedProblemsGenerator;
}

interface OuterProps extends CommonProps {
  readonly userSubmissions: Submission[];
  readonly problems: List<Problem>;
}

const InnerRecommendations: React.FC<InnerProps> = (props) => {
  const {
    recommendedProblemsGenerator,
    contests,
    problemModels,
    userRatingInfo,
  } = props;

  const [recommendOption, setRecommendOption] = useState<RecommendOption>(
    "Moderate"
  );
  const [recommendExperimental, setRecommendExperimental] = useState(true);
  const [excludeOption, setExcludeOption] = useState<ExcludeOption>("Exclude");
  const [recommendNum, setRecommendNum] = useState(10);

  const filteredRecommendedProblems = recommendedProblemsGenerator.filtered({
    recommendOption,
    excludeOption,
    recommendExperimental,
    recommendNum,
  });

  return (
    <>
      <RecommendationsFilterBar
        recommendOption={recommendOption}
        setRecommendOption={setRecommendOption}
        excludeOption={excludeOption}
        setExcludeOption={setExcludeOption}
        recommendExperimental={recommendExperimental}
        setRecommendExperimental={setRecommendExperimental}
        recommendNum={recommendNum}
        setRecommendNum={setRecommendNum}
      />
      <RecommendationsTable
        recommendedProblems={filteredRecommendedProblems}
        contests={contests}
        problemModels={problemModels}
        userRatingInfo={userRatingInfo}
        isLoggedIn={props.isLoggedIn}
      />
    </>
  );
};

export const Recommendations: React.FC<OuterProps> = (props) => {
  const { problems, userSubmissions, problemModels, userRatingInfo } = props;

  if (userSubmissions.length == 0) {
    return null;
  }

  const recommendedProblemsGenerator = new RecommendedProblemsGenerator(
    problems,
    userSubmissions,
    problemModels,
    userRatingInfo
  );

  return (
    <InnerRecommendations
      recommendedProblemsGenerator={recommendedProblemsGenerator}
      contests={props.contests}
      problemModels={props.problemModels}
      userRatingInfo={props.userRatingInfo}
    />
  );
};
