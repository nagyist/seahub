import React, { Component } from 'react';
import PropTypes from 'prop-types';
import dayjs from 'dayjs';
import classnames from 'classnames';
import relativeTime from 'dayjs/plugin/relativeTime';
import { DropdownItem } from 'reactstrap';
import { seafileAPI } from '../../utils/seafile-api';
import { gettext } from '../../utils/constants';
import { Utils } from '../../utils/utils';
import toaster from '../../components/toast';
import ConfirmUnlinkDeviceDialog from '../../components/dialog/confirm-unlink-device';
import MobileItemMenu from '../../components/mobile-item-menu';

dayjs.extend(relativeTime);

class Content extends Component {

  render() {
    const { loading, errorMsg, items } = this.props;

    if (loading) {
      return <span className="loading-icon loading-tip"></span>;
    } else if (errorMsg) {
      return <p className="error text-center">{errorMsg}</p>;
    } else {
      const emptyTip = (
        <p>{gettext('No linked devices. You have not accessed your files with any client (desktop or mobile) yet. Configure clients on your devices to access your data more comfortably.')}</p>
      );

      const desktopThead = (
        <thead>
          <tr>
            <th width="13%">{gettext('Platform')}</th>
            <th width="30%">{gettext('Device Name')}</th>
            <th width="30%">{gettext('IP')}</th>
            <th width="17%">{gettext('Last Access')}</th>
            <th width="10%"></th>
          </tr>
        </thead>
      );
      const mobileThead = (
        <thead>
          <tr>
            <th width="92%"></th>
            <th width="8%"></th>
          </tr>
        </thead>
      );

      const isDesktop = Utils.isDesktop();
      return items.length ? (
        <table className={`${isDesktop ? '' : 'table-thead-hidden'}`}>
          {isDesktop ? desktopThead : mobileThead}
          <tbody>
            {items.map((item, index) => {
              return <Item key={index} data={item} isDesktop={isDesktop} />;
            })}
          </tbody>
        </table>
      ) : emptyTip;
    }
  }
}

Content.propTypes = {
  loading: PropTypes.bool.isRequired,
  errorMsg: PropTypes.string.isRequired,
  items: PropTypes.array.isRequired
};

class Item extends Component {

  constructor(props) {
    super(props);
    this.state = {
      isHighlighted: false,
      isOpIconShown: false,
      unlinked: false,
      isConfirmUnlinkDialogOpen: false
    };
  }

  handleMouseOver = () => {
    this.setState({
      isHighlighted: true,
      isOpIconShown: true
    });
  };

  handleMouseOut = () => {
    this.setState({
      isHighlighted: false,
      isOpIconShown: false
    });
  };

  toggleDialog = () => {
    this.setState({
      isConfirmUnlinkDialogOpen: !this.state.isConfirmUnlinkDialogOpen
    });
  };

  handleClick = () => {
    const data = this.props.data;
    if (data.is_desktop_client) {
      this.toggleDialog();
    } else {
      const wipeDevice = true;
      this.unlinkDevice(wipeDevice);
    }
  };

  unlinkDevice = (wipeDevice) => {
    const data = this.props.data;
    seafileAPI.unlinkDevice(data.platform, data.device_id, wipeDevice).then((res) => {
      this.setState({
        unlinked: true
      });
      let msg = gettext('Successfully unlinked %(name)s.');
      msg = msg.replace('%(name)s', data.device_name);
      toaster.success(msg);
    }).catch((error) => {
      let errMessage = Utils.getErrorMsg(error);
      toaster.danger(errMessage);
    });
  };

  renderDesktop = () => {
    const data = this.props.data;
    const { isHighlighted } = this.state;
    let opClasses = 'sf3-font-delete1 sf3-font unlink-device op-icon';
    opClasses += this.state.isOpIconShown ? '' : ' invisible';
    return (
      <tr
        className={classnames({
          'tr-highlight': isHighlighted
        })}
        onMouseOver={this.handleMouseOver}
        onMouseOut={this.handleMouseOut}
        onFocus={this.handleMouseOver}
      >
        <td>{data.platform}</td>
        <td>{data.device_name}</td>
        <td>{data.last_login_ip}</td>
        <td>{dayjs(data.last_accessed).fromNow()}</td>
        <td>
          <i
            role="button"
            className={opClasses}
            title={gettext('Unlink')}
            aria-label={gettext('Unlink')}
            onClick={this.handleClick}
          >
          </i>
        </td>
      </tr>
    );
  };

  renderMobile = () => {
    const data = this.props.data;
    return (
      <tr>
        <td>
          {data.device_name}<br />
          <span className="item-meta-info">{data.last_login_ip}</span>
          <span className="item-meta-info">{dayjs(data.last_accessed).fromNow()}</span>
          <span className="item-meta-info">{data.platform}</span>
        </td>
        <td>
          <MobileItemMenu>
            <DropdownItem className="mobile-menu-item" onClick={this.handleClick}>{gettext('Unlink')}</DropdownItem>
          </MobileItemMenu>
        </td>
      </tr>
    );
  };

  render() {
    if (this.state.unlinked) {
      return null;
    }
    return (
      <React.Fragment>
        {this.props.isDesktop ? this.renderDesktop() : this.renderMobile()}
        {this.state.isConfirmUnlinkDialogOpen &&
        <ConfirmUnlinkDeviceDialog
          executeOperation={this.unlinkDevice}
          toggleDialog={this.toggleDialog}
        />
        }
      </React.Fragment>
    );
  }
}

Item.propTypes = {
  isDesktop: PropTypes.bool.isRequired,
  data: PropTypes.object.isRequired,
};

class LinkedDevices extends Component {
  constructor(props) {
    super(props);
    this.state = {
      loading: true,
      errorMsg: '',
      items: []
    };
  }

  componentDidMount() {
    seafileAPI.listLinkedDevices().then((res) => {
      this.setState({
        loading: false,
        items: res.data
      });
    }).catch((error) => {
      this.setState({
        loading: false,
        errorMsg: Utils.getErrorMsg(error, true) // true: show login tip if 403
      });
    });
  }

  render() {
    const { loading, errorMsg, items } = this.state;
    return (
      <div className="setting-item" id="linked-devices">
        <h3 className="setting-item-heading">{gettext('Linked Devices')}</h3>
        <div>
          <Content
            loading={loading}
            errorMsg={errorMsg}
            items={items}
          />
        </div>
      </div>
    );
  }
}

export default LinkedDevices;
