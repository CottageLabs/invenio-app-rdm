import React, {Component} from "react";
import PropTypes from "prop-types";
import {Grid, Accordion, Icon, Header, Segment, Table} from "semantic-ui-react";
import {i18next} from "@translations/invenio_app_rdm/i18next";
import { useVersions } from "./VersionsProvider";

const EndorsementsDisplayContent = ({ record, allVersions, versionsLoading, versionsError }) => {
  const [activeIndex, setActiveIndex] = React.useState(-1);

  const handleAccordionClick = (e, titleProps) => {
    const {index} = titleProps;
    const newIndex = activeIndex === index ? -1 : index;
    setActiveIndex(newIndex);
  };

  const formatDate = (dateString) => {
    if (!dateString) return "";
    return dateString.substring(0, 10);
  };

  const getMostRecent = (list) => {
    if (!list || list.length === 0) return null;
    return list.sort((a, b) => new Date(b.created) - new Date(a.created))[0];
  };

  const getSortedReviews = (reviewList) => {
    if (!reviewList) return [];

    const grouped = reviewList.reduce((acc, review) => {
      const index = review.index;
      if (!acc[index]) {
        acc[index] = [];
      }
      acc[index].push(review);
      return acc;
    }, {});

    return Object.entries(grouped).map(([index, reviews]) => ({
      index: parseInt(index),
      reviews: reviews.sort((a, b) => new Date(b.created) - new Date(a.created))
    })).sort((a, b) => b.index - a.index);
  };

  const getVersion = (review, versions, latestVersion) => {
    if(review.index === latestVersion.index) {
      return getVersionWithIcon(review, versions, latestVersion);
    }

    return 'v' + review.index;
  }

  const getVersionWithIcon = (review, versions, latestVersion) => {
    if(versions === {})
      return <>v{review.index}</>;

    const isLatest = review.index === latestVersion.index;

    let icon_url = isLatest ? "notify-current.svg" : "notify-previous.svg";
    let currentMessage = "Current version of the record";
    let previousMessage = `Outdated version of the record. Current version: ${latestVersion.version}`;
    let message = isLatest ? currentMessage : previousMessage;

    let icon = <img
      className="inline-id-icon ml-5"
      src={`/static/images/${icon_url}`}
      alt={message}
      title={message}
    />;

    if (review.version) return <>{icon} {review.version}</>;

    return <>{icon} v{review.index}</>;

  };

  // Filter reviewers that have endorsements
  const validEndorsements = record.endorsements.filter(
    endorsement => endorsement.endorsement_list.length > 0 || endorsement.review_list.length > 0
  );

  if (validEndorsements.length === 0) {
    return null;
  }

  // Don't render until versions are loaded
  if (versionsLoading) {
    return null;
  }

  // Handle error state
  if (versionsError) {
    return null;
  }

  return (
    <Segment className="ui segment bottom attached rdm-sidebar">
      {validEndorsements.map((endorsement, endorsementIndex) => {
        const mostRecentEndorsement = getMostRecent(endorsement.endorsement_list);
        const mostRecentReview = getMostRecent(endorsement.review_list);
        const latestVersion = allVersions.hits.find(item => item.is_latest);
        const sortedReviews = getSortedReviews(endorsement.review_list);

        return (<Accordion key={`endorsement-${endorsement.reviewer_id}-${endorsementIndex}`}>
          <Accordion.Title
            active={activeIndex === endorsementIndex}
            index={endorsementIndex}
            onClick={handleAccordionClick}
            className="title"
          >

            <Header as="div" className="ui left aligned header small mb-0 trigger">
              <Icon name={activeIndex === endorsementIndex ? "caret down" : "caret right"}/>
              {endorsement.review_count} {endorsement.reviewer_name}
            </Header>

            {mostRecentEndorsement && (
              <div className="ui center aligned content mt-5">
                {i18next.t("Most recent endorsement: ")}
                <a href={mostRecentEndorsement.url} target="_blank" rel="noopener noreferrer">
                  {formatDate(mostRecentEndorsement.created)}
                </a>
              </div>
            )}

            {mostRecentReview && (
              <div className="ui center aligned content mt-5">
                {i18next.t("Most recent review: ")}
                <a href={mostRecentReview.url} target="_blank" rel="noopener noreferrer">
                  {formatDate(mostRecentReview.created)}
                </a> on {getVersionWithIcon(mostRecentReview, allVersions, latestVersion)}
              </div>
            )}

          </Accordion.Title>
          <Accordion.Content active={activeIndex === endorsementIndex}>
            <Table striped>
              <Table.Header>
                <Table.Row>
                  <Table.HeaderCell collapsing>Version</Table.HeaderCell>
                  <Table.HeaderCell>Reviews</Table.HeaderCell>
                </Table.Row>
              </Table.Header>
              <Table.Body>
                {sortedReviews.map((item, itemIndex) => (
                  <Table.Row key={`review-${item.index}-${itemIndex}`}>
                    <Table.Cell textAlign="center">{getVersion(item, allVersions, latestVersion)}</Table.Cell>
                    <Table.Cell>
                      <Grid divided compact="true">
                        {item.reviews.reduce((rows, review, idx) => {
                          if (idx % 3 === 0) rows.push([]);
                          rows[rows.length - 1].push(review);
                          return rows;
                        }, []).map((rowReviews, rowIdx) => (
                          <Grid.Row key={`row-${item.index}-${rowIdx}`}>
                            {rowReviews.map((review, idx) => (
                              <Grid.Column key={`col-${review.created}-${idx}`} width={5}>
                                <a
                                  href={review.url}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                >
                                  {formatDate(review.created)}
                                </a>
                              </Grid.Column>
                            ))}
                          </Grid.Row>
                        ))}
                      </Grid>
                    </Table.Cell>
                  </Table.Row>
                ))}
              </Table.Body>
            </Table>
          </Accordion.Content>
        </Accordion>)
      })}
    </Segment>
  );
};

EndorsementsDisplayContent.propTypes = {
  record: PropTypes.object.isRequired,
  allVersions: PropTypes.object.isRequired,
  versionsLoading: PropTypes.bool.isRequired,
  versionsError: PropTypes.string,
};

export const EndorsementsDisplay = ({ record }) => {
  const { allVersions, versionsLoading, versionsError } = useVersions();
  
  return (
    <EndorsementsDisplayContent 
      record={record}
      allVersions={allVersions}
      versionsLoading={versionsLoading}
      versionsError={versionsError}
    />
  );
};

EndorsementsDisplay.propTypes = {
  record: PropTypes.object.isRequired,
};

export default EndorsementsDisplay;
