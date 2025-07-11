import React, { Component } from "react";
import PropTypes from "prop-types";
import { Grid, Dropdown, Button } from "semantic-ui-react";
import { i18next } from "@translations/invenio_app_rdm/i18next";
import { http, withCancel } from "react-invenio-forms";

export class EndorsementRequestDropdown extends Component {
  constructor(props) {
    super(props);
    const { formats } = this.props;
    this.state = {
      selectedReviewerId: formats[0]?.reviewer_id,
      loading: false,
      error: null,
      endorsementRequests: []
    };
  }

  fetchRecordEndorsementRequests = async () => {
    const { endorsementRequestEndpoint } = this.props;
    return await http.post(endorsementRequestEndpoint,
      {'reviewer_id': 123},
      {
        headers: {
          Accept: "application/json",
        },
    });
  };

  getEndorsementRequests = async () => {
    this.cancellableFetchEndorsementRequests = withCancel(this.fetchRecordEndorsementRequests());
    this.setState({
      loading: true,
      error: null,
    });
    try {
      const response = await this.cancellableFetchEndorsementRequests.promise;
      const responseData = response;
      this.setState({
        endorsementRequests: responseData.data,
        loading: false,
      });
    } catch (error) {
      if (error !== "UNMOUNTED") {
        this.setState({
          loading: false,
          error: i18next.t("An error occurred while fetching endorsement requests."),
        });
      }
    }
  };


  render() {
    const { formats } = this.props;
    const { selectedReviewerId } = this.state;
    const endorsementRequestOptions = formats.map((option, index) => {
      return {
        key: `option-${index}`,
        text: option.name,
        value: option.reviewer_id,
      };
    });



    return (
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
    );
  }
}

EndorsementRequestDropdown.propTypes = {
  formats: PropTypes.array.isRequired,
  endorsementRequestEndpoint: PropTypes.string.isRequired,
};
