import React from "react";
import { Row } from "reactstrap";
import { connect, PromiseState } from "react-refetch";
import { List } from "immutable";
import Submission from "../../interfaces/Submission";
import { ProblemId } from "../../interfaces/Status";
import ProblemModel from "../../interfaces/ProblemModel";
import * as CachedApiClient from "../../utils/CachedApiClient";
import * as ImmutableMigration from "../../utils/ImmutableMigration";
import { RatingInfo, ratingInfoOf } from "../../utils/RatingInfo";
import Problem from "../../interfaces/Problem";
import { SubmissionListTable } from "../../components/SubmissionListTable";

interface OuterProps {
  userId: string;
}

interface InnerProps extends OuterProps {
  submissionsFetch: PromiseState<Submission[]>;
  problemsFetch: PromiseState<Problem[]>;
  problemModelsFetch: PromiseState<Map<ProblemId, ProblemModel>>;
  ratingInfoFetch: PromiseState<RatingInfo>;
}

const InnerSubmissions: React.FC<InnerProps> = (props) => {
  const submissions = props.submissionsFetch.fulfilled
    ? props.submissionsFetch.value.sort((a, b) => b.id - a.id)
    : [];
  const problems = props.problemsFetch.fulfilled
    ? props.problemsFetch.value
    : [];
  const problemModels = props.problemModelsFetch.fulfilled
    ? props.problemModelsFetch.value
    : new Map<ProblemId, ProblemModel>();
  const ratingInfo = props.ratingInfoFetch.fulfilled
    ? props.ratingInfoFetch.value
    : ratingInfoOf(List());

  return (
    <Row>
      <SubmissionListTable
        submissions={submissions}
        problems={problems}
        problemModels={problemModels}
        userRatingInfo={ratingInfo}
      />
    </Row>
  );
};

export const Submissions = connect<OuterProps, InnerProps>(({ userId }) => ({
  submissionsFetch: {
    comparison: userId,
    value: CachedApiClient.cachedSubmissions(userId).then((list) =>
      list.toArray()
    ),
  },
  problemModelsFetch: {
    value: CachedApiClient.cachedProblemModels().then((map) =>
      ImmutableMigration.convertMap(map)
    ),
  },
  problemsFetch: {
    value: CachedApiClient.cachedProblemMap().then((map) =>
      map.valueSeq().toArray()
    ),
  },
  ratingInfoFetch: {
    comparison: userId,
    value: CachedApiClient.cachedRatingInfo(userId),
  },
}))(InnerSubmissions);