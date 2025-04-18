import React, { Fragment } from 'react';
import dayjs from 'dayjs';
import MainPanelTopbar from '../main-panel-topbar';
import StatisticNav from './statistic-nav';
import StatisticCommonTool from './statistic-common-tool';
import { orgAdminAPI } from '../../../utils/org-admin-api';
import StatisticChart from './statistic-chart';
import Loading from '../../../components/loading';
import { gettext, orgID } from '../../../utils/constants';
import { Utils } from '../../../utils/utils';
import toaster from '../../../components/toast';

import '../../../css/system-stat.css';

class OrgStatisticFile extends React.Component {

  constructor(props) {
    super(props);
    this.state = {
      filesData: [],
      labels: [],
      isLoading: true
    };
  }

  getActiviesFiles = (startTime, endTime, groupBy) => {
    let { filesData } = this.state;

    orgAdminAPI.orgAdminStatisticFiles(orgID, startTime, endTime, groupBy).then((res) => {
      let labels = [];
      let added = [];
      let deleted = [];
      let visited = [];
      let modified = [];
      let data = res.data;
      if (Array.isArray(data)) {
        data.forEach(item => {
          labels.push(dayjs(item.datetime).format('YYYY-MM-DD'));
          added.push(item.added);
          deleted.push(item.deleted);
          modified.push(item.modified);
          visited.push(item.visited);
        });
        let addedData = {
          label: gettext('Added'),
          data: added,
          borderColor: '#57cd6b',
          backgroundColor: '#57cd6b' };
        let visitedData = {
          label: gettext('Visited'),
          data: visited,
          borderColor: '#fd913a',
          backgroundColor: '#fd913a' };
        let modifiedData = {
          label: gettext('Modified'),
          data: modified,
          borderColor: '#72c3fc',
          backgroundColor: '#72c3fc' };
        let deletedData = {
          label: gettext('Deleted'),
          data: deleted,
          borderColor: '#f75356',
          backgroundColor: '#f75356' };
        filesData = [visitedData, addedData, modifiedData, deletedData];
      }
      this.setState({
        filesData: filesData,
        labels: labels,
        isLoading: false
      });
    }).catch(err => {
      let errMessage = Utils.getErrorMsg(err);
      toaster.danger(errMessage);
    });
  };

  render() {
    let { labels, filesData, isLoading } = this.state;

    return (
      <Fragment>
        <MainPanelTopbar />
        <div className="cur-view-container">
          <StatisticNav currentItem="fileStatistic" />
          <div className="cur-view-content">
            <StatisticCommonTool getActiviesFiles={this.getActiviesFiles} />
            {isLoading && <Loading />}
            {!isLoading && labels.length > 0 &&
              <StatisticChart
                labels={labels}
                filesData={filesData}
                suggestedMaxNumbers={10}
                isLegendStatus={true}
                chartTitle={gettext('File Operations')}
              />
            }
          </div>
        </div>
      </Fragment>
    );
  }
}

export default OrgStatisticFile;
