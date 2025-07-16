import React, { Component } from "react";
import PropTypes from "prop-types";
import { Grid, Dropdown, Button, Table } from "semantic-ui-react";
import { i18next } from "@translations/invenio_app_rdm/i18next";
import { http, withCancel, ErrorMessage } from "react-invenio-forms";
import { SuccessIcon } from "@js/invenio_communities/members";

// KTODO convert status type value to readable text

class ReviewerListTable extends Component {
  render() {
    const { reviewerOptions } = this.props;
    
    return (
      <Table
        celled
        compact
        size="small"
        unstackable
        style={{
          marginTop: '1rem',
          width: '100%',
          tableLayout: 'fixed'
        }}
      >
        <Table.Header>
          <Table.Row>
            <Table.HeaderCell style={{ width: '65%' }}>{i18next.t("Reviewer")}</Table.HeaderCell>
            <Table.HeaderCell style={{ width: '35%' }}>{i18next.t("Status")}</Table.HeaderCell>
          </Table.Row>
        </Table.Header>
        <Table.Body>
          {reviewerOptions.map((reviewer, index) => (
            <Table.Row key={`reviewer-${index}`}>
              <Table.Cell style={{ width: '70%', overflow: 'hidden', textOverflow: 'ellipsis' }}>{reviewer.reviewer_name}</Table.Cell>
              <Table.Cell style={{ width: '30%' }}>
                {reviewer.available ? (
                  <span className="ui green label">{i18next.t("Available")}</span>
                ) : (
                  <span className="ui label">{i18next.t(reviewer.status)}</span>
                )}
              </Table.Cell>
            </Table.Row>
          ))}
        </Table.Body>
      </Table>
    );
  }
}

ReviewerListTable.propTypes = {
  reviewerOptions: PropTypes.array.isRequired,
};

class EndorsementRequestForm extends Component {
  render() {
    const { endorsementRequestOptions, selectedReviewerId, loading, onReviewerChange, onSubmit } = this.props;
    
    return (
      <Grid>
        <Grid.Column width={11}>
          <Dropdown
            aria-label={i18next.t("Reviewer selection")}
            selection
            fluid
            selectOnNavigation={false}
            options={endorsementRequestOptions}
            onChange={onReviewerChange}
            defaultValue={selectedReviewerId}
          />
        </Grid.Column>
        <Grid.Column width={5} className="pl-0">
          <Button
            role="button"
            fluid
            onClick={onSubmit}
            loading={loading}
            title={i18next.t("Request reviewer for endorsement")}
          >
            {i18next.t("Request")}
          </Button>
        </Grid.Column>
      </Grid>
    );
  }
}

EndorsementRequestForm.propTypes = {
  endorsementRequestOptions: PropTypes.array.isRequired,
  selectedReviewerId: PropTypes.string,
  loading: PropTypes.bool.isRequired,
  onReviewerChange: PropTypes.func.isRequired,
  onSubmit: PropTypes.func.isRequired,
};

export class EndorsementRequestDropdown extends Component {
  constructor(props) {
    super(props);
    this.state = {
      selectedReviewerId: null,
      loading: false,
      error: null,
      success: false,
      endorsementRequests: [],
      reviewerOptions: []
    };
  }

  componentDidMount() {
    this.loadReviewerOptions();
  }


  handleAsyncFetch = async (fetchFunction, stateKey, errorMessage, onError, onSuccess) => {
    const cancellablePromise = withCancel(fetchFunction());
    this.setState({
      loading: true,
      error: null,
      success: false,
    });
    try {
      const response = await cancellablePromise.promise;
      const newState = { loading: false };
      if (stateKey) {
        newState[stateKey] = response.data;
      }
      this.setState(newState);

      if (onSuccess) {
        onSuccess(response);
      }
    } catch (error) {
      if (error !== "UNMOUNTED") {
        const errorText = error?.response?.data?.message || error?.message || i18next.t(errorMessage);

        if (onError) {
          onError(error, errorText);
        } else {
          this.setState({
            loading: false,
            error: errorText,
          });
        }
      }
    }
  };

  loadReviewerOptions = async () => {
    const fetchReviewerOption = async () => {
      const { reviewerOptionEndpoint } = this.props;
      return await http.get(reviewerOptionEndpoint, {
        headers: {
          Accept: "application/json",
        },
      });
    };

    await this.handleAsyncFetch(
      fetchReviewerOption,
      null,
      'An error occurred while fetching reviewer options.',
      null,
      (response) => {
        const reviewerOptions = [...response.data].sort(
          (a, b) => a.reviewer_name.localeCompare(b.reviewer_name)
        );
        const availableReviewers = reviewerOptions.filter(option => option.available);
        this.setState({
          reviewerOptions: reviewerOptions,
          selectedReviewerId: availableReviewers.length > 0 ? availableReviewers[0].reviewer_id : null
        });
      }

    );
  };

  sendEndorsementRequest = async () => {
    const fetchRecordEndorsementRequests = async () => {
      const { endorsementRequestEndpoint } = this.props;
      return await http.post(endorsementRequestEndpoint,
        {'reviewer_id': this.state.selectedReviewerId},
        {
          headers: {
            Accept: "application/json",
          },
      });
    };

    await this.handleAsyncFetch(
      fetchRecordEndorsementRequests,
      'endorsementRequests',
      'An error occurred while sending endorsement request.',
      null,
      () => {
        this.setState({ success: true });
        this.loadReviewerOptions();
      }
    );
  };

  handleReviewerChange = (event, data) => {
    this.setState({ selectedReviewerId: data.value });
  };

  handleSubmit = () => {
    this.sendEndorsementRequest();
  };


  render() {
    const { reviewerOptions, selectedReviewerId, error, success } = this.state;
    const availableReviewers = reviewerOptions.filter(option => option.available);
    const endorsementRequestOptions = availableReviewers.map((option, index) => {
      return {
        key: `option-${index}`,
        text: option.reviewer_name,
        value: option.reviewer_id,
      };
    });

    return (
      <>
        {error && (
          <ErrorMessage
            header={i18next.t("Unable to process endorsement request")}
            content={error}
            icon="exclamation"
            negative
            size="mini"
          />
        )}
        {success && (
          <SuccessIcon
            timeOutDelay={10000}
            show={success}
            content={
              <div role="alert" className="ui positive message">
                <div className="header">
                  {i18next.t("Endorsement request sent successfully")}
                </div>
                <p>{i18next.t("Your endorsement request has been sent to the reviewer.")}</p>
              </div>
            }
          />
        )}
        {endorsementRequestOptions.length > 0 && (
          <EndorsementRequestForm
            endorsementRequestOptions={endorsementRequestOptions}
            selectedReviewerId={selectedReviewerId}
            loading={this.state.loading}
            onReviewerChange={this.handleReviewerChange}
            onSubmit={this.handleSubmit}
          />
        )}
      {reviewerOptions.length > 0 && (
        <ReviewerListTable reviewerOptions={reviewerOptions} />
      )}
      </>
    );
  }
}

EndorsementRequestDropdown.propTypes = {
  formats: PropTypes.array.isRequired,
  endorsementRequestEndpoint: PropTypes.string.isRequired,
  reviewerOptionEndpoint: PropTypes.string.isRequired,
};
