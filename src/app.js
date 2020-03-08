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
import result0 from './data/result0.json';
import result1 from './data/result1.json';
import result2 from './data/result2.json';
import result3 from './data/result3.json';
import result4 from './data/result4.json';
import result5 from './data/result5.json';
import result6 from './data/result6.json';
import result7 from './data/result7.json';
import result8 from './data/result8.json';
import result9 from './data/result9.json';
import config from './data/config';
import request from 'request';

const MAPBOX_TOKEN = process.env.MapboxAccessToken; // eslint-disable-line
const BASE_URL = "http://127.0.0.1:5000"

let constructDataset = (otherData, iden) => {
  const data = Processors.processGeojson(otherData);
  return {data, info: {id: iden}};
}

class App extends Component {
  componentDidMount() {
    let data0 = constructDataset(result0, "result0");
    let data1 = constructDataset(result1, "result1");
    let data2 = constructDataset(result2, "result2");
    let data3 = constructDataset(result3, "result3");
    let data4 = constructDataset(result4, "result4");
    let data5 = constructDataset(result5, "result5");
    let data6 = constructDataset(result6, "result6");
    let data7 = constructDataset(result7, "result7");
    let data8 = constructDataset(result8, "result8");
    let data9 = constructDataset(result9, "result9");
    let allData = [data0, data1, data2, data3, data4, data5, data6, data7, data8, data9];
    console.log(JSON.stringify(allData))
    this.props.dispatch(addDataToMap({datasets: allData, config: config}));
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
    let data0 = constructDataset(result0, "result0");
    let data1 = constructDataset(result1, "result1");
    let data2 = constructDataset(result2, "result2");
    let data3 = constructDataset(result3, "result3");
    let data4 = constructDataset(result4, "result4");
    let data5 = constructDataset(result5, "result5");
    let data6 = constructDataset(result6, "result6");
    let data7 = constructDataset(result7, "result7");
    let data8 = constructDataset(result8, "result8");
    let data9 = constructDataset(result9, "result9");
    let allData = [data0, data1, data2, data3, data4, data5, data6, data7, data8, data9];

    const config = this.getMapConfig();

    this.props.dispatch(addDataToMap({datasets: allData, config}));
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
    // <Button onClick={this.exportMapConfig}>Export Config</Button>
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
            width:500,
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
