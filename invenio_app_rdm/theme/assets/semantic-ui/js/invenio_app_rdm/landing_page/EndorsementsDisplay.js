import React, {Component} from "react";
import PropTypes from "prop-types";
import {Grid, Accordion, Icon, Header, Segment, Table} from "semantic-ui-react";
import {i18next} from "@translations/invenio_app_rdm/i18next";
import { withCancel, http } from "react-invenio-forms";

export class EndorsementsDisplay extends Component {
  constructor(props) {
    super(props);
    this.state = {
      activeIndices: [],
      allVersions: {},
      versionsLoading: true,
      versionsError: null
    };
    this.cancellableFetch = null;
  }

  componentDidMount() {
    this.fetchAllVersions();
  }

  componentWillUnmount() {
    if (this.cancellableFetch) {
      this.cancellableFetch.cancel();
    }
  }

  fetchAllVersions = async () => {
    const { record } = this.props;

    if (!record || !record.links || !record.links.versions) {
      this.setState({ versionsLoading: false, versionsError: "No versions link available" });
      return;
    }

    const fetchVersions = async () => {
      return await http.get(
        `${record.links.versions}?size=1000&sort=version&allversions=true`,
        {
          headers: {
            Accept: "application/vnd.inveniordm.v1+json",
          },
          withCredentials: true,
        }
      );
    };

    this.cancellableFetch = withCancel(fetchVersions());

    try {
      const result = await this.cancellableFetch.promise;

      let { hits, total } = result.data.hits;
      hits = hits.map(record => ({
        id: record.id,
        version: record.ui.version,
        index: record.versions.index,
        is_latest: record.versions.is_latest,
      }));

      this.setState({
        allVersions: { hits, total },
        versionsLoading: false
      });
    } catch (error) {
      if (error !== "UNMOUNTED") {
        this.setState({
          versionsError: "An error occurred while fetching the versions.",
          versionsLoading: false
        });
      }
    }
  }

  handleAccordionClick = (e, titleProps) => {
    const {index} = titleProps;
    const {activeIndices} = this.state;
    const newIndices = activeIndices.includes(index)
      ? activeIndices.filter(i => i !== index)
      : [...activeIndices, index];
    this.setState({activeIndices: newIndices});
  };

  formatDate = (dateString) => {
    if (!dateString) return "";
    return dateString.substring(0, 10);
  };

  getMostRecent = (list) => {
    if (!list || list.length === 0) return null;
    return list.sort((a, b) => new Date(b.created) - new Date(a.created))[0];
  };

  getSortedReviews = (reviewList) => {
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

  getVersion = (review, versions, latestVersion) => {
    if(review.index === latestVersion.index) {
      return this.getVersionWithIcon(review, versions, latestVersion);
    }

    return 'v' + review.index;
  }

  getVersionWithIcon = (review, versions, latestVersion) => {
    if(versions === {})
      return <>v{review.index}</>;

    const isLatest = review.index === latestVersion.index;

    let icon_url = isLatest ? "notify-current.svg" : "notify-previous.svg";
    let currentMessage = i18next.t("Current version of the record");
    let previousMessage = i18next.t("Outdated version of the record. Current version: {{version}}", { version: latestVersion.version });
    let message = isLatest ? currentMessage : previousMessage;

    let icon = <img
      className="inline-id-icon"
      src={`/static/images/${icon_url}`}
      alt={message}
      title={message}
    />;

    if (review.version) return <>{icon} {review.version}</>;

    return <>{icon} v{review.index}</>;

  };

  render() {
    const {record} = this.props;
    const {activeIndices, allVersions, versionsLoading, versionsError} = this.state;

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

    // Calculate total review count and find most recent review across all reviewers
    let totalReviewCount = 0;
    let mostRecentReview = null;

    validEndorsements.forEach(endorsement => {
      totalReviewCount += endorsement.review_list.length;
      const recentReview = this.getMostRecent(endorsement.review_list);
      if (recentReview && (!mostRecentReview || new Date(recentReview.created) > new Date(mostRecentReview.created))) {
        mostRecentReview = recentReview;
      }
    });

    const latestVersion = allVersions.hits.find(item => item.is_latest);

    return (
      <Segment className="ui segment bottom attached rdm-sidebar">

        {validEndorsements.length > 1 && (
          <Header as="h4" className="ui small header">
            {totalReviewCount > 0 && (
              <span className="ui small text"> {totalReviewCount} {i18next.t(totalReviewCount === 1 ? "review" : "reviews")}</span>
            )}
            {mostRecentReview && (
              <div className="ui normal text mt-5">
                {i18next.t("Most recent:")}&nbsp;
                <a href={mostRecentReview.url} target="_blank" rel="noopener noreferrer">
                  {this.formatDate(mostRecentReview.created)}
                </a>
                {latestVersion && (
                  <span> {i18next.t("on")} {this.getVersionWithIcon(mostRecentReview, allVersions, latestVersion)}</span>
                )}
              </div>
            )}
          </Header>
        )}

        {validEndorsements.map((endorsement, endorsementIndex) => {
          const mostRecentEndorsement = this.getMostRecent(endorsement.endorsement_list);
          const mostRecentReview = this.getMostRecent(endorsement.review_list);
          const latestVersion = allVersions.hits.find(item => item.is_latest);
          const sortedReviews = this.getSortedReviews(endorsement.review_list);
          const hasReviews = endorsement.review_list.length > 0;

          return (<Accordion key={`endorsement-${endorsement.reviewer_id}-${endorsementIndex}`} className="ui fluid accordion segment">
            <Accordion.Title
              active={activeIndices.includes(endorsementIndex)}
              index={endorsementIndex}
              onClick={hasReviews ? this.handleAccordionClick : undefined}
              className="title"
            >

              <Header as="div" className="ui left aligned header small mb-0 trigger">
                {hasReviews && <Icon name={activeIndices.includes(endorsementIndex) ? "caret down" : "caret right"}/>}
                {endorsement.reviewer_name}{endorsement.review_count > 0 && ` (${endorsement.review_count})`}
              </Header>

              {mostRecentEndorsement && (
                <div className="ui center aligned content mt-5">
                  {i18next.t("Endorsement:")}&nbsp;
                  <a href={mostRecentEndorsement.url} target="_blank" rel="noopener noreferrer">
                    {this.formatDate(mostRecentEndorsement.created)}
                  </a>
                </div>
              )}

              {mostRecentReview && (
                <div className="ui center aligned content mt-5">
                  {i18next.t("Most recent review:")}&nbsp;
                  <a href={mostRecentReview.url} target="_blank" rel="noopener noreferrer">
                    {this.formatDate(mostRecentReview.created)}
                  </a> {i18next.t("on")} {this.getVersionWithIcon(mostRecentReview, allVersions, latestVersion)}
                </div>
              )}

            </Accordion.Title>
            <Accordion.Content active={activeIndices.includes(endorsementIndex)}>
              <Table striped unstackable>
                <Table.Header>
                  <Table.Row>
                    <Table.HeaderCell collapsing>{i18next.t("Version")}</Table.HeaderCell>
                    <Table.HeaderCell>{i18next.t("Reviews")}</Table.HeaderCell>
                  </Table.Row>
                </Table.Header>
                <Table.Body>
                  {sortedReviews.map((item, itemIndex) => (
                    <Table.Row key={`review-${item.index}-${itemIndex}`}>
                      <Table.Cell textAlign="center" className="right bordered">{this.getVersion(item, allVersions, latestVersion)}</Table.Cell>
                      <Table.Cell>
                        <Grid divided compact="true">
                          {item.reviews.reduce((rows, review, idx) => {
                            if (idx % 2 === 0) rows.push([]);
                            rows[rows.length - 1].push(review);
                            return rows;
                          }, []).map((rowReviews, rowIdx) => (
                            <Grid.Row key={`row-${item.index}-${rowIdx}`}>
                              {rowReviews.map((review, idx) => (
                                <Grid.Column key={`col-${review.created}-${idx}`} computer={8} tablet={8} mobile={16} textAlign="center">
                                  <a
                                    href={review.url}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                  >
                                    {this.formatDate(review.created)}
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
  }
}

EndorsementsDisplay.propTypes = {
  record: PropTypes.object.isRequired,
};

export default EndorsementsDisplay;
