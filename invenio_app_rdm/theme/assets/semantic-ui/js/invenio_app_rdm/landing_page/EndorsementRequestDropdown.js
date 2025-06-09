import React, { Component } from "react";
import PropTypes from "prop-types";
import { Grid, Dropdown, Button } from "semantic-ui-react";
import { i18next } from "@translations/invenio_app_rdm/i18next";

export class EndorsementRequestDropdown extends Component {
  constructor(props) {
    super(props);
    const { formats } = this.props;
    this.state = {
      selectedReviewerId: formats[0]?.reviewer_id
    };
  }
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
            as="a"
            role="button"
            fluid
            href={selectedReviewerId}
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
};
