// This file is part of InvenioRDM
// Copyright (C) 2020-2024 CERN.
// Copyright (C) 2020-2021 Northwestern University.
// Copyright (C) 2021 Graz University of Technology.
//
// Invenio RDM Records is free software; you can redistribute it and/or modify it
// under the terms of the MIT License; see LICENSE file for more details.

import _get from "lodash/get";
import React, { useState } from "react";
import { Grid, Icon, Message, Placeholder, List, Divider } from "semantic-ui-react";
import { i18next } from "@translations/invenio_app_rdm/i18next";
import PropTypes from "prop-types";
import { ErrorMessage } from "react-invenio-forms";
import { useSharedVersions } from "./useSharedVersions";

const deserializeRecord = (record) => ({
  id: record.id,
  parent: record.parent,
  parent_id: record.parent.id,
  publication_date: record.ui.publication_date_l10n_medium,
  version: record.ui.version,
  links: record.links,
  pids: record.pids,
  new_draft_parent_doi: record.ui.new_draft_parent_doi,
});

const NUMBER_OF_VERSIONS = 5;

const RecordVersionItem = ({ item, activeVersion }) => {
  const doi = _get(item.pids, "doi.identifier", "");
  return (
    <List.Item key={item.id} {...(activeVersion && { className: "version active" })}>
      <List.Content floated="left">
        {activeVersion ? (
          <span className="text-break">
            {i18next.t("Version {{- version}}", { version: item.version })}
          </span>
        ) : (
          <a href={`/records/${item.id}`} className="text-break">
            {i18next.t("Version {{- version}}", { version: item.version })}
          </a>
        )}

        {doi && (
          <a
            href={`https://doi.org/${doi}`}
            className={"doi" + (activeVersion ? " text-muted-darken" : " text-muted")}
          >
            {doi}
          </a>
        )}
      </List.Content>

      <List.Content floated="right">
        <small className={activeVersion ? "text-muted-darken" : "text-muted"}>
          {item.publication_date}
        </small>
      </List.Content>
    </List.Item>
  );
};

RecordVersionItem.propTypes = {
  item: PropTypes.object.isRequired,
  activeVersion: PropTypes.bool.isRequired,
};

const PreviewMessage = () => {
  return (
    <Message info className="no-border-radius m-0">
      <Message.Header>
        <Icon name="eye" />
        {i18next.t("Preview")}
      </Message.Header>
      <p>{i18next.t("Only published versions are displayed.")}</p>
    </Message>
  );
};

const RecordVersionsListContent = ({ record, isPreview, allVersions, versionsLoading, versionsError }) => {
  const recordDeserialized = deserializeRecord(record);
  const recordParentDOI = recordDeserialized?.parent?.pids?.doi?.identifier;
  const recordDraftParentDOIFormat = recordDeserialized?.new_draft_parent_doi;
  const recid = recordDeserialized.id;
  const [currentRecordInResults, setCurrentRecordInResults] = useState(false);

  // Check if current record is in results when versions load
  React.useEffect(() => {
    if (!versionsLoading && allVersions.hits) {
      setCurrentRecordInResults(allVersions.hits.some((record) => record.id === recid));
    }
  }, [allVersions, versionsLoading, recid]);

  const loadingcmp = () => {
    return isPreview ? (
      <PreviewMessage />
    ) : (
      <>
        <div className="rel-p-1" />
        <Placeholder className="rel-ml-1 rel-mr-1">
          <Placeholder.Header>
            <Placeholder.Line />
            <Placeholder.Line />
            <Placeholder.Line />
          </Placeholder.Header>
        </Placeholder>
      </>
    );
  };

  const errorMessagecmp = () => (
    <ErrorMessage className="rel-mr-1 rel-ml-1" content={i18next.t(versionsError)} negative />
  );

  const recordVersionscmp = () => (
    <List divided>
      {isPreview ? <PreviewMessage /> : null}
      {allVersions.hits.slice(0, NUMBER_OF_VERSIONS).map((item) => (
        <RecordVersionItem
          key={item.id}
          item={item}
          activeVersion={item.id === recid}
        />
      ))}
      {!currentRecordInResults && (
        <>
          <Divider horizontal>...</Divider>
          <RecordVersionItem item={recordDeserialized} activeVersion />
        </>
      )}
      {allVersions.total > 1 && (
        <Grid className="mt-0">
          <Grid.Row centered>
            <a
              href={`/search?q=parent.id:${recordDeserialized.parent_id}&sort=version&f=allversions:true`}
              className="font-small"
            >
              {i18next.t(`View all {{count}} versions`, {
                count: allVersions.total,
              })}
            </a>
          </Grid.Row>
        </Grid>
      )}
      {recordParentDOI ? (
        <List.Item className="parent-doi pr-0">
          <List.Content floated="left">
            <p className="text-muted">
              <strong>{i18next.t("Cite all versions?")}</strong>{" "}
              {i18next.t("You can cite all versions by using the DOI")}{" "}
              <a href={recordDeserialized.links.parent_doi}>{recordParentDOI}</a>.{" "}
              {i18next.t(
                "This DOI represents all versions, and will always resolve to the latest one."
              )}{" "}
              <a href="/help/versioning">{i18next.t("Read more")}</a>.
            </p>
          </List.Content>
        </List.Item>
      ) : recordDraftParentDOIFormat ? (
        // new drafts without registered parent dois yet
        <List.Item className="parent-doi pr-0">
          <List.Content floated="left">
            <p className="text-muted">
              <strong>{i18next.t("Cite all versions?")}</strong>{" "}
              {i18next.t("You can cite all versions by using the DOI")}{" "}
              {recordDraftParentDOIFormat}.{" "}
              {i18next.t("The DOI is registered when the first version is published.")}{" "}
              <a href="/help/versioning">{i18next.t("Read more")}</a>.
            </p>
          </List.Content>
        </List.Item>
      ) : null}
    </List>
  );

  return versionsLoading ? loadingcmp() : versionsError ? errorMessagecmp() : recordVersionscmp();
};

RecordVersionsListContent.propTypes = {
  record: PropTypes.object.isRequired,
  isPreview: PropTypes.bool.isRequired,
  allVersions: PropTypes.object.isRequired,
  versionsLoading: PropTypes.bool.isRequired,
  versionsError: PropTypes.string,
};

export const RecordVersionsList = ({ record, isPreview }) => {
  const { allVersions, versionsLoading, versionsError } = useSharedVersions(record);

  return (
    <RecordVersionsListContent
      record={record}
      isPreview={isPreview}
      allVersions={allVersions}
      versionsLoading={versionsLoading}
      versionsError={versionsError}
    />
  );
};

RecordVersionsList.propTypes = {
  record: PropTypes.object.isRequired,
  isPreview: PropTypes.bool.isRequired,
};
