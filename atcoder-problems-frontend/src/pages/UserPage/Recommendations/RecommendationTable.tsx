import { Map as ImmutableMap } from "immutable";
import React from "react";
import { useHistory } from "react-router-dom";
import {
  BootstrapTable,
  SelectRow,
  SelectRowMode,
  TableHeaderColumn,
} from "react-bootstrap-table";
import { Button, ButtonGroup, Row } from "reactstrap";
import { ProblemId } from "../../../interfaces/Status";
import Contest from "../../../interfaces/Contest";
import ProblemModel from "../../../interfaces/ProblemModel";
import { RatingInfo } from "../../../utils/RatingInfo";
import { PROBLEMID_SEPARATE_SYMBOL } from "../../../utils/QueryString";
import { ProblemLink } from "../../../components/ProblemLink";
import { ContestLink } from "../../../components/ContestLink";
import { NewTabLink } from "../../../components/NewTabLink";
import Problem from "../../../interfaces/Problem";
import * as Url from "../../../utils/Url";
import { HelpBadgeTooltip } from "../../../components/HelpBadgeTooltip";
import {
  formatPredictedSolveProbability,
  formatPredictedSolveTime,
} from "../../../utils/ProblemModelUtil";
import { RecommendedProblem } from "./RecommendationFilter";

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
const useProblemIdSet = (): [
  Set<ProblemId>,
  (ids: ProblemId[]) => void,
  (ids: ProblemId[]) => void
] => {
  const [selectedProblemIdSet, dispatch] = React.useReducer(
    problemIdSetReducer,
    problemIdSetInit()
  );
  const selectProblemIds = (ids: ProblemId[]) =>
    dispatch({ type: "ADD", ids: ids });
  const deselectProblemIds = (ids: ProblemId[]) =>
    dispatch({ type: "DELETE", ids: ids });

  return [selectedProblemIdSet, selectProblemIds, deselectProblemIds];
};

interface TableProps {
  readonly recommendedProblems: RecommendedProblem[];
  readonly contests: ImmutableMap<string, Contest>;
  readonly problemModels: ImmutableMap<string, ProblemModel>;
  readonly userRatingInfo: RatingInfo;
  readonly isLoggedIn?: boolean;
}

export const RecommendationTable: React.FC<TableProps> = (props) => {
  const {
    recommendedProblems,
    contests,
    problemModels,
    userRatingInfo,
    isLoggedIn,
  } = props;

  const history = useHistory();

  const [
    selectedProblemIdSet,
    selectProblemIds,
    deselectProblemIds,
  ] = useProblemIdSet();

  const selectedProblemIds = Array.from(selectedProblemIdSet);

  const problemIdToString = selectedProblemIds.join(PROBLEMID_SEPARATE_SYMBOL);
  const createContestLocation = {
    pathname: "/contest/create",
    search: !problemIdToString ? "" : "?problemIds=" + problemIdToString,
  };

  interface HasProblemId {
    id: ProblemId;
  }
  const selectRowProps = isLoggedIn
    ? ({
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
      } as SelectRow)
    : undefined;

  return (
    <>
      {isLoggedIn && (
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
