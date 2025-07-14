import React, { Component } from "react";
import PropTypes from "prop-types";
import { Grid, Dropdown, Button } from "semantic-ui-react";
import { i18next } from "@translations/invenio_app_rdm/i18next";
import { http, withCancel, ErrorMessage } from "react-invenio-forms";
import { SuccessIcon } from "@js/invenio_communities/members";

export class EndorsementRequestDropdown extends Component {
  constructor(props) {
    super(props);
    const { formats } = this.props;
    this.state = {
      selectedReviewerId: formats[0]?.reviewer_id,
      loading: false,
      error: null,
      success: false,
      endorsementRequests: [],
      reviewerOptions: formats || []
    };
  }

  componentDidMount() {
    this.getReviewerOptions();
  }

  fetchRecordEndorsementRequests = async () => {
    const { endorsementRequestEndpoint } = this.props;
    return await http.post(endorsementRequestEndpoint,
      {'reviewer_id': this.state.selectedReviewerId},
      {
        headers: {
          Accept: "application/json",
        },
    });
  };

  fetchReviewerOption = async () => {
    const { reviewerOptionEndpoint } = this.props;
    return await http.get(reviewerOptionEndpoint, {
      headers: {
        Accept: "application/json",
      },
    });
  };

  handleAsyncFetch = async (fetchFunction, stateKey, errorMessage, onError, onSuccess) => {
    const cancellablePromise = withCancel(fetchFunction());
    this.setState({
      loading: true,
      error: null,
      success: false,
    });
    try {
      const response = await cancellablePromise.promise;
      this.setState({
        [stateKey]: response.data,
        loading: false,
      });

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

  getReviewerOptions = async () => {
    await this.handleAsyncFetch(
      this.fetchReviewerOption,
      'reviewerOptions',
      'An error occurred while fetching reviewer options.'
    );
  };

  getEndorsementRequests = async () => {
    await this.handleAsyncFetch(
      this.fetchRecordEndorsementRequests,
      'endorsementRequests',
      'An error occurred while sending endorsement request.',
      null,
      () => {
        this.setState({ success: true });
      }
    );
  };


  render() {
    const { selectedReviewerId, reviewerOptions, error, success } = this.state;
    const endorsementRequestOptions = reviewerOptions.map((option, index) => {
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
        <Grid>
        <Grid.Column width={11}>
          <Dropdown
            aria-label={i18next.t("Reviewer selection")}
            selection
            fluid
            selectOnNavigation={false}
            options={endorsementRequestOptions}
            onChange={(event, data) => this.setState({ selectedReviewerId: data.value })}
            defaultValue={selectedReviewerId}
          />
        </Grid.Column>
        <Grid.Column width={5} className="pl-0">
          <Button
            role="button"
            fluid
            onClick={this.getEndorsementRequests}
            loading={this.state.loading}
            title={i18next.t("Request reviewer for endorsement")}
          >
            {i18next.t("Request")}
          </Button>
        </Grid.Column>
      </Grid>
      </>
    );
  }
}

EndorsementRequestDropdown.propTypes = {
  formats: PropTypes.array.isRequired,
  endorsementRequestEndpoint: PropTypes.string.isRequired,
  reviewerOptionEndpoint: PropTypes.string.isRequired,
};
