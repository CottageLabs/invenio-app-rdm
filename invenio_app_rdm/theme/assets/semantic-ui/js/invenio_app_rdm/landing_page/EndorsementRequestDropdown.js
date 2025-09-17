import React, { Component } from "react";
import PropTypes from "prop-types";
import { Grid, Dropdown, Button, Table } from "semantic-ui-react";
import { i18next } from "@translations/invenio_app_rdm/i18next";
import { http, withCancel, ErrorMessage } from "react-invenio-forms";
import { SuccessIcon } from "@js/invenio_communities/members";

const getStatusDisplayName = (status) => {
  const statusMap = {
    'coar-notify:ReviewAction': 'Review',
    'coar-notify:EndorsementAction': 'Endorsement',
    'TentativeAccept': 'Tentative Accept',
    'Reject': 'Reject',
    'TentativeReject': 'Tentative Reject',
    'available': 'Available',
  };

  return statusMap[status] || status;
};

class ActorListTable extends Component {
  getStatusLabel = (actor) => {
    const labelClass = actor.status === 'available' ? 'green' : '';
    return <span className={`ui ${labelClass} label`}>{i18next.t(getStatusDisplayName(actor.status))}</span>;
  };

  render() {
    const { actorOptions } = this.props;

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
            <Table.HeaderCell style={{ width: '65%' }}>{i18next.t("Actor")}</Table.HeaderCell>
            <Table.HeaderCell style={{ width: '35%' }}>{i18next.t("Status")}</Table.HeaderCell>
          </Table.Row>
        </Table.Header>
        <Table.Body>
          {actorOptions.map((actor, index) => (
            <Table.Row key={`actor-${index}`}>
              <Table.Cell style={{ width: '70%', overflow: 'hidden', textOverflow: 'ellipsis' }}>{actor.actor_name}</Table.Cell>
              <Table.Cell style={{ width: '30%' }}>
                {this.getStatusLabel(actor)}
              </Table.Cell>
            </Table.Row>
          ))}
        </Table.Body>
      </Table>
    );
  }
}

ActorListTable.propTypes = {
  actorOptions: PropTypes.array.isRequired,
};

class EndorsementRequestForm extends Component {
  render() {
    const { options, selectedId, loading, onChange, onSubmit } = this.props;

    return (
      <Grid>
        <Grid.Column width={11}>
          <Dropdown
            aria-label={i18next.t("Actor selection")}
            selection
            fluid
            selectOnNavigation={true}
            options={options}
            onChange={onChange}
            defaultValue={selectedId}
          />
        </Grid.Column>
        <Grid.Column width={5} className="pl-0">
          <Button
            role="button"
            fluid
            onClick={onSubmit}
            loading={loading}
            title={i18next.t("Request actor for endorsement")}
          >
            {i18next.t("Request")}
          </Button>
        </Grid.Column>
      </Grid>
    );
  }
}

EndorsementRequestForm.propTypes = {
  options: PropTypes.array.isRequired,
  selectedId: PropTypes.string,
  loading: PropTypes.bool.isRequired,
  onChange: PropTypes.func.isRequired,
  onSubmit: PropTypes.func.isRequired,
};

export class EndorsementRequestDropdown extends Component {
  constructor(props) {
    super(props);
    this.state = {
      selectedActorId: null,
      loading: false,
      error: null,
      endoReqSuccess: false,
      actorOptions: [],
      shouldRenderComponent: false
    };
  }

  componentDidMount() {
    this.loadActorOptions();
  }


  handleAsyncFetch = async (fetchFunction, stateKey, errorMessage, onError, onSuccess) => {
    const cancellablePromise = withCancel(fetchFunction());
    this.setState({
      loading: true,
      error: null,
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

  loadActorOptions = async () => {
    const fetchActorOption = async () => {
      const { actorOptionEndpoint } = this.props;
      return await http.get(actorOptionEndpoint, {
        headers: {
          Accept: "application/json",
        },
      });
    };

    await this.handleAsyncFetch(
      fetchActorOption,
      null,
      'An error occurred while fetching actor options.',
      null,
      (response) => {
        const actorOptions = [...response.data].sort(
          (a, b) => a.actor_name.localeCompare(b.actor_name)
        );
        const availableActors = actorOptions.filter(option => option.available);
        this.setState({
          actorOptions: actorOptions,
          selectedActorId: availableActors.length > 0 ? availableActors[0].actor_id : null,
          shouldRenderComponent: actorOptions.length > 0
        });

        // Hide the entire sidebar section if no actors are available
        if (actorOptions.length === 0) {
          const sidebarContainer = document.querySelector('#recordEndorsementRequest')?.closest('.sidebar-container');
          if (sidebarContainer) {
            sidebarContainer.style.display = 'none';
          }
        }
      }

    );
  };

  sendEndorsementRequest = async () => {
  this.setState({endoReqSuccess: false});
    const fetchRecordEndorsementRequests = async () => {
      const { endorsementRequestEndpoint } = this.props;
      return await http.post(endorsementRequestEndpoint,
        {'actor_id': this.state.selectedActorId},
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
        this.setState({ endoReqSuccess: true });
        this.loadActorOptions();
      }
    );
  };

  handleActorChange = (event, data) => {
    this.setState({ selectedActorId: data.value });
  };

  handleSubmit = () => {
    this.sendEndorsementRequest();
  };


  render() {
    const { actorOptions, selectedActorId, error, endoReqSuccess, shouldRenderComponent } = this.state;

    if (!shouldRenderComponent) {
      return null;
    }
    const availableActors = actorOptions.filter(option => option.available);
    const endorsementRequestOptions = availableActors.map((option, index) => {
      return {
        key: `option-${index}`,
        text: option.actor_name,
        value: option.actor_id,
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
        {endoReqSuccess && (
          <SuccessIcon
            timeOutDelay={10000}
            show={endoReqSuccess}
            content={
              <div role="alert" className="ui positive message">
                <div className="header">
                  {i18next.t("Endorsement request sent successfully")}
                </div>
                <p>{i18next.t("Your endorsement request has been sent to the actor.")}</p>
              </div>
            }
          />
        )}
        {endorsementRequestOptions.length > 0 && (
          <EndorsementRequestForm
            options={endorsementRequestOptions}
            selectedId={selectedActorId}
            loading={this.state.loading}
            onChange={this.handleActorChange}
            onSubmit={this.handleSubmit}
          />
        )}
      {actorOptions.length > 0 && (
        <ActorListTable actorOptions={actorOptions} />
      )}
      </>
    );
  }
}

EndorsementRequestDropdown.propTypes = {
  endorsementRequestEndpoint: PropTypes.string.isRequired,
  actorOptionEndpoint: PropTypes.string.isRequired,
};

