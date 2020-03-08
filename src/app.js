// Copyright (c) 2018 Uber Technologies, Inc.
//
// Permission is hereby granted, free of charge, to any person obtaining a copy
// of this software and associated documentation files (the "Software"), to deal
// in the Software without restriction, including without limitation the rights
// to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
// copies of the Software, and to permit persons to whom the Software is
// furnished to do so, subject to the following conditions:
//
// The above copyright notice and this permission notice shall be included in
// all copies or substantial portions of the Software.
//
// THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
// IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
// FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
// AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
// LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
// OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN
// THE SOFTWARE.

import React, {Component} from 'react';
import {connect} from 'react-redux';
import AutoSizer from 'react-virtualized/dist/commonjs/AutoSizer';
import KeplerGl from 'kepler.gl';
import Autocomplete from 'react-google-autocomplete';
import requst from 'request';
import 'typeface-roboto';


// Kepler.gl actions
import {addDataToMap} from 'kepler.gl/actions';
// Kepler.gl Data processing APIs
import Processors from 'kepler.gl/processors';

// Kepler.gl Schema APIs
import KeplerGlSchema from 'kepler.gl/schemas';

// Component and helpers
import Button from './button';
import downloadJsonFile from "./file-download";

// Sample data
import result1 from './data/result1.json';
import config from './data/config';
import request from 'request';

const MAPBOX_TOKEN = process.env.MapboxAccessToken; // eslint-disable-line
const BASE_URL = "http://127.0.0.1:5000"

class App extends Component {
  componentDidMount() {
    const data = Processors.processGeojson(result1);
    const dataset = {
      data,
      info: {
        id: 'my_data'
      }
    };
    this.props.dispatch(addDataToMap({datasets: dataset, config: config}));
  }

  getMapConfig() {
    const {keplerGl} = this.props;
    const {map} = keplerGl;
    return KeplerGlSchema.getConfigToSave(map);
  }

  exportMapConfig = () => {
    const mapConfig = this.getMapConfig();
    downloadJsonFile(mapConfig, 'kepler.gl.json');
  };

  replaceData = () => {
    const data = Processors.processGeojson(nycTripsSubset);
    const dataset = {
      data,
      info: {
        id: 'my_data'
      }
    };

    const config = this.getMapConfig();

    this.props.dispatch(addDataToMap({datasets: dataset, config}));
  };

  onDestSelect = (loc) => {
    let lat = loc.geometry.location.lat();
    let lng = loc.geometry.location.lng();
    let url = BASE_URL + "/changegeojson/" + lat + "," + lng;
    request.get(url).on("response", (response) => {
      this.replaceData()
    });
  }

  render() {

    return (
                
      <div style={{position: 'absolute', width: '100%', height: '100%', minHeight: '70vh'}}>
        <span style={{
          position: 'absolute',
          top: 42,
          left: 32,
          color: "white",
          zIndex: 10000,
          fontSize: 18,
          fontFamily: "Roboto",
        }}>Add Destination: </span>
        <Autocomplete
          style={{width: '90%',
            fontSize:18,
            padding:10,
            display:"block",
            width:300,
            border:"none",
            borderBottom:[1, "solid", "#757575"],
            position: "absolute",
            zIndex: 100,
            top: 27,
            left: 170,
            color: "white",
            backgroundColor: "rgba(0, 0, 0, 0.75)",
            margin: 5
          }}
          onPlaceSelected={this.onDestSelect}
          types={['address']}
        />
        <AutoSizer>
          {({height, width}) => (
            <KeplerGl
              mapboxApiAccessToken={MAPBOX_TOKEN}
              id="map"
              width={width}
              height={height}
            />
          )}
        </AutoSizer>
      </div>
    );
  }
}


const mapStateToProps = state => state;
const dispatchToProps = dispatch => ({dispatch});

export default connect(mapStateToProps, dispatchToProps)(App);
