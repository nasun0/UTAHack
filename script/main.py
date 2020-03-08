from urllib.parse import urlparse, urlunparse, urlencode
from flask_cors import CORS, cross_origin
from collections import namedtuple
from subprocess import call
from flask import Flask
import requests
import json


cur_coor = [-97.11303, 32.72968]


app = Flask(__name__)
app.config['CORS_HEADERS'] = 'Content-Type'
cors = CORS(app)


cur_coor = list(reversed(cur_coor))
PolylineHeader = namedtuple('PolylineHeader',
                            'precision,third_dim,third_dim_precision')
result_idx = 0


DECODING_TABLE = [
    62, -1, -1, 52, 53, 54, 55, 56, 57, 58, 59, 60, 61, -1, -1, -1, -1, -1, -1,
    -1, 0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16, 17, 18, 19,
    20, 21, 22, 23, 24, 25, -1, -1, -1, -1, 63, -1, 26, 27, 28, 29, 30, 31, 32,
    33, 34, 35, 36, 37, 38, 39, 40, 41, 42, 43, 44, 45, 46, 47, 48, 49, 50, 51
]


def decode_header(decoder):
    next(decoder)
    value = next(decoder)
    precision = value & 15
    value >>= 4
    third_dim = value & 7
    third_dim_precision = (value >> 3) & 15
    return PolylineHeader(precision, third_dim, third_dim_precision)


def decode_char(char):
    """Decode a single char to the corresponding value"""
    char_value = ord(char)
    value = DECODING_TABLE[char_value - 45]
    return value


def decode_unsigned_values(encoded):
    result = shift = 0
    for char in encoded:
        value = decode_char(char)
        result |= (value & 0x1F) << shift
        if (value & 0x20) == 0:
            yield result
            result = shift = 0
        else:
            shift += 5


def to_signed(value):
    if value & 1:
        value = ~value
    value >>= 1
    return value


def iter_decode(encoded):
    last_lat = last_lng = last_z = 0
    decoder = decode_unsigned_values(encoded)
    header = decode_header(decoder)
    factor_degree = 10.0 ** header.precision
    factor_z = 10.0 ** header.third_dim_precision
    third_dim = header.third_dim
    while True:
        try:
            last_lat += to_signed(next(decoder))
        except StopIteration:
            return
        last_lng += to_signed(next(decoder))

        if third_dim:
            last_z += to_signed(next(decoder))
            yield (last_lat / factor_degree, last_lng / factor_degree,
                   last_z / factor_z)
        else:
            yield (last_lat / factor_degree, last_lng / factor_degree)


def decode_polyline(s):
    return list(iter_decode(s))


def encode_parameters(parameters):
    if parameters is None:
        return None
    return urlencode(dict((k, v) for k, v in parameters.items()
                          if v is not None))


def build_url(url, extra_params=None):
    (scheme, netloc, path, params, query, fragment) = urlparse(url)
    params_length = len(extra_params)
    if extra_params and params_length > 0:
        extra_query = encode_parameters(extra_params)
        if query:
            query += '&' + extra_query
        else:
            query = extra_query
    return urlunparse((scheme, netloc, path, params, query, fragment))


def get_response(url, data):
    url = build_url(url, extra_params=data)
    return json.loads(requests.get(url).content.decode())


def address_suggestion(address, coor, radius):
    data = {'query': address, 'prox': f'{coor[0]},{coor[1]},{radius}',
            'apikey': api_key}
    return get_response('https://autocomplete.geocoder.ls.hereapi.com'
                        '/6.2/suggest.json', data)


def address_with_details(house_number, street, city, country):
    data = {'housenumber': house_number, 'street': street, 'city': city,
            'country': country, 'apiKey': api_key}
    return get_response('https://geocoder.ls.hereapi.com/6.2/geocode.json',
                        data)


def array_to_waypoint(arr):
    return f'{arr[0]},{arr[1]}'


def get_route(coora, coorb):
    modes = ['shortest', 'traffic:default']
    data = {
        'transportMode': 'car',
        'mode': ';'.join(map(str, modes)),
        'origin': array_to_waypoint(coora),
        'destination': array_to_waypoint(coorb),
        'apiKey': api_key,
        'return': 'polyline',
    }
    route_url = 'https://router.hereapi.com/v8/routes'
    res = get_response(route_url, data)
    return decode_polyline(res['routes'][0]['sections'][0]['polyline'])


with open('../secret.json') as f:
    data = json.load(f)
api_key = data['api-key']


def get_coor(address, cur_coor):
    res = address_suggestion(address, cur_coor, 100)
    res = res['suggestions'][0]['address']
    house_number = int(res['houseNumber'])
    street = res['street']
    city = res['city']
    country = res['country']
    details = address_with_details(house_number, street, city, country)
    details = details['Response']['View'][0]['Result']
    details = details[0]['Location']['DisplayPosition']
    return [details['Longitude'], details['Latitude']]


def get_geojson_from_coor(coor):
    new_coor = list(reversed(coor))
    route = get_route(cur_coor, new_coor)

    route = [list(reversed(i)) for i in route]
    result = {}
    result['type'] = 'FeatureCollection'
    result['features'] = []
    features = result['features']
    start = {}
    start['type'] = 'Feature'
    start['geometry'] = {'type': 'Point', 'coordinates': route[0]}
    start['properties'] = {}
    end = {}
    end['type'] = 'Feature'
    end['geometry'] = {'type': 'Point', 'coordinates': route[-1]}
    end['properties'] = {}
    middle = {}
    middle['type'] = 'Feature'
    middle['geometry'] = {'type': 'LineString', 'coordinates': route}
    middle['properties'] = {}
    features.append(start)
    features.append(end)
    features.append(middle)
    with open('result.json', 'w') as f:
        json.dump(result, f)


def get_empty():
    result = {}
    result['type'] = 'FeatureCollection'
    result['features'] = []
    features = result['features']
    start = {}
    start['type'] = 'Feature'
    start['geometry'] = {'type': 'Point', 'coordinates': []}
    start['properties'] = {}
    end = {}
    end['type'] = 'Feature'
    end['geometry'] = {'type': 'Point', 'coordinates': []}
    end['properties'] = {}
    middle = {}
    middle['type'] = 'Feature'
    middle['geometry'] = {'type': 'LineString', 'coordinates': []}
    middle['properties'] = {}
    features.append(start)
    features.append(end)
    features.append(middle)
    with open('result.json', 'w') as f:
        json.dump(result, f)


def get_geojson(address):
    global cur_coor
    new_coor = get_coor(address, cur_coor)
    get_geojson_from_coor(new_coor)


cross_origin_args = {'origin': '*', 'headers': ['Content-Type']}


@app.route("/changegeojson/<coors>")
@cross_origin(**cross_origin_args)
def change_geojson(coors):
    global result_idx
    coora, coorb = map(float, coors.split(','))
    get_geojson_from_coor([coorb, coora])
    call(f"cp ./result.json ../src/data/result{result_idx}.json",
         shell=True)
    result_idx = (result_idx + 1) % 10
    return "Success!"


@app.route("/changegeojsonremote/<coors>")
@cross_origin(**cross_origin_args)
def change_geojson_remote(coors):
    global cur_coor
    old_coor = cur_coor
    cur_coor = [33.07478, -96.78836]
    change_geojson(coors)
    cur_coor = old_coor
    return "Success!"


@app.route("/request")
@cross_origin(**cross_origin_args)
def website():
    with open('mobile.html') as f:
        data = f.read()
    return data


get_empty()
for i in range(10):
    call(f"cp ./result.json ../src/data/result{i}.json", shell=True)
app.run(host='0.0.0.0')
