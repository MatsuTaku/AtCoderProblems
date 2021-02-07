import React, { useState } from "react";
import { List, Map as ImmutableMap } from "immutable";
import Submission from "../../../interfaces/Submission";
import Problem from "../../../interfaces/Problem";
import Contest from "../../../interfaces/Contest";
import ProblemModel from "../../../interfaces/ProblemModel";
import { RatingInfo } from "../../../utils/RatingInfo";
import { RecommendationTable } from "./RecommendationTable";
import {
  ExcludeOption,
  RecommendationsFilterBar,
  RecommendedProblemsGenerator,
  RecommendOption,
} from "./RecommendationFilter";

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
      <RecommendationTable
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
