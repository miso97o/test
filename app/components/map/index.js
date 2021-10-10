/* eslint-disable react-native/no-inline-styles */
import React, {Component} from 'react';
import {
  StyleSheet,
  View,
  Text,
  TouchableOpacity,
  TextInput,
  PermissionsAndroid,
} from 'react-native';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';

import NaverMapView, {Marker, Align} from 'react-native-nmap';
import {Picker} from '@react-native-picker/picker';
import Geolocation from 'react-native-geolocation-service';

import {CLIENT_ID, CLIENT_SECERET, URL} from '../../utils/misc';

async function requestPermission() {
  return await PermissionsAndroid.request(
    PermissionsAndroid.PERMISSIONS.ACCESS_FINE_LOCATION,
  );
}

class MapComponent extends Component {
  state = {
    loc: {
      latitude: 0,
      longitude: 0,
    },
    address: '',
    marker: {
      latitude: 0,
      longitude: 0,
    },
    currentLocation: {
      longitude: 0,
      latitude: 0,
    },
    rooms: [],
    touched: false,
    mode: 'enter', // create or enter
    title: '',
    category: 'exercise',
    roomId: '',
  };

  getloc = (e) => {
    this.setState({
      loc: {latitude: e.latitude, longitude: e.longitude},
      touched: false,
    });
  };

  getAddress = async (longitude, latitude) => {
    await fetch(
      `https://naveropenapi.apigw.ntruss.com/map-reversegeocode/v2/gc?request=coordsToaddr&coords=${longitude},${latitude}&sourcecrs=epsg:4326&output=json&orders=addr,roadaddr
      `,
      {
        headers: {
          'X-NCP-APIGW-API-KEY-ID': CLIENT_ID,
          'X-NCP-APIGW-API-KEY': CLIENT_SECERET,
        },
      },
    )
      .then((response) => response.json())
      .then((responseJson) => {
        console.log(responseJson);
        let jibunAddr = '';
        let roadAddr = '';
        for (let key in responseJson.results) {
          const item = responseJson.results[key];
          if (responseJson.results[key].name === 'addr') {
            jibunAddr = `${item.region.area1.name} ${item.region.area2.name} ${item.region.area3.name} ${item.land.number1} `;
            if (item.land.number2) {
              jibunAddr += `- ${item.land.number2}`;
            }
          } else if (responseJson.results[key].name === 'roadaddr') {
            roadAddr = `${item.region.area1.name} ${item.region.area2.name} ${item.land.name} ${item.land.number1} ${item.land.addition0.value}`;
          }
        }
        console.log('road: ', roadAddr + ' jibun: ', jibunAddr);
        roadAddr === ''
          ? this.setState({address: jibunAddr})
          : this.setState({address: roadAddr});
      })
      .catch((e) => console.log(e));
  };

  touchedMarker = (P) => {
    return <Marker coordinate={P} width={80} height={90} />;
  };

  modeChange = () => {
    this.state.mode === 'create'
      ? this.setState({mode: 'enter'})
      : this.setState({mode: 'create'});
    this.setState({title: '', category: '', loc: {latitude: 0, longitude: 0}});
  };

  createRoom = async () => {
    await fetch(`${URL}chat/createRoom`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        name: this.state.title,
        userId: 'userId2',
        latitude: this.state.loc.latitude,
        longitude: this.state.loc.longitude,
        category: this.state.category,
      }),
    })
      .then((response) => {
        console.log('res: ', response);
        response.json().then((responseJson) => {
          this.setState({roomId: responseJson.roomId});
        });
      })
      .then(() => {
        this.enterRoom();
      });
  };

  search = () => {
    console.log('search button touched!!');
    this.setState({touched: false});
  };

  getRooms = async () => {
    await fetch(`${URL}chat/rooms`)
      .then((response) => response.json())
      .then((responseJson) => {
        console.log(responseJson);
        this.setState({rooms: responseJson});
      });
  };

  enterRoom = async () => {
    await fetch(`${URL}chat/room/${this.state.roomId}?userId=userId1`).then(
      (res) => {
        console.log(res);
        this.props.navigation.navigate('Chat', {
          roomId: this.state.roomId,
          userId: 'userId1',
        });
      },
    );
  };

  onChangeInput = (value) => {
    this.setState({title: value});
  };

  componentDidMount() {
    requestPermission().then((result) => {
      // console.log({result});
      if (result === 'granted') {
        Geolocation.getCurrentPosition(
          (pos) => {
            // console.log(pos);
            this.setState({
              currentLocation: {
                longitude: pos.coords.longitude,
                latitude: pos.coords.latitude,
              },
            });
          },
          (error) => {
            console.log(error);
          },
          {enableHighAccuracy: true, timeout: 3600, maximumAge: 3600},
        );
      }
    });
    this.getRooms();
    // beforeRemove는 유저가 이전화면으롤 떠나지 못하게 함.
    this.props.navigation.addListener('beforeRemove', (e) => {
      // preventDefault는 이벤트로 정의된 기본 액션을 취함
      e.preventDefault();
    });
  }

  render() {
    var P = this.state.rooms;
    return (
      <View>
        {this.state.mode === 'enter' ? (
          <View>
            {this.state.touched ? (
              // enter에 touched가 true
              <View>
                <NaverMapView
                  style={{width: '100%', height: '85%'}}
                  showsMyLocationButton={true}
                  center={{...this.state.marker, zoom: 16}}
                  onMapClick={() =>
                    this.setState({touched: false, title: '', category: ''})
                  }>
                  {P.map((item, idx) => (
                    <Marker
                      coordinate={{
                        latitude: item.latitude,
                        longitude: item.longitude,
                      }}
                      key={idx}
                      onClick={() => [
                        this.setState({
                          touched: true,
                          marker: {
                            longitude: item.longitude,
                            latitude: item.latitude,
                          },
                          title: item.name,
                          category: item.category,
                          roomId: item.roomId,
                        }),
                        this.getAddress(item.longitude, item.latitude),
                      ]}
                    />
                  ))}
                </NaverMapView>
                <View style={styles.searchButton}>
                  <TouchableOpacity>
                    <Icon name="search-web" size={44} />
                  </TouchableOpacity>
                </View>
                <View style={styles.container}>
                  <View style={{width: '80%'}}>
                    <Text style={styles.titleText}>{this.state.title}</Text>
                    <Text style={styles.defText}>{this.state.category}</Text>
                    <Text style={styles.defText}>{this.state.address}</Text>
                  </View>
                  <TouchableOpacity
                    style={styles.button}
                    onPress={() => this.enterRoom()}>
                    <Text>참여</Text>
                  </TouchableOpacity>
                </View>
              </View>
            ) : (
              // enter에 touched가 false
              <View>
                <NaverMapView
                  style={{width: '100%', height: '90%'}}
                  showsMyLocationButton={true}
                  center={{...this.state.currentLocation, zoom: 16}}>
                  {P.map((item, idx) => (
                    <Marker
                      coordinate={{
                        latitude: item.latitude,
                        longitude: item.longitude,
                      }}
                      key={idx}
                      onClick={() => [
                        this.setState({
                          touched: true,
                          marker: {
                            longitude: item.longitude,
                            latitude: item.latitude,
                          },
                          title: item.name,
                          category: item.category,
                          roomId: item.roomId,
                        }),
                        this.getAddress(item.longitude, item.latitude),
                      ]}
                    />
                  ))}
                  {this.state.touched
                    ? this.touchedMarker(this.state.marker)
                    : null}
                </NaverMapView>
                {/* 검색 버튼 */}
                <View style={styles.searchButton}>
                  <TextInput
                    value={this.state.title}
                    onChangeText={(value) => this.onChangeInput(value)}
                    placeholder="방제 검색"
                    style={{fontSize: 20, fontWeight: 'bold', marginLeft: 5}}
                    maxLength={12}
                  />
                  <TouchableOpacity>
                    <Icon name="search-web" size={44} />
                  </TouchableOpacity>
                </View>
                <View
                  style={{
                    height: '10%',
                    width: '100%',
                    alignItems: 'center',
                    justifyContent: 'center',
                    backgroundColor: '#09affc',
                  }}>
                  <TouchableOpacity onPress={() => this.modeChange()}>
                    <Text style={{fontSize: 30, fontWeight: 'bold'}}>
                      방 만들기
                    </Text>
                  </TouchableOpacity>
                </View>
              </View>
            )}
          </View>
        ) : (
          //mode가 create
          <View>
            <NaverMapView
              style={{width: '100%', height: '80%'}}
              center={{...this.state.currentLocation, zoom: 16}}
              onMapClick={(e) => [
                this.getloc(e),
                this.getAddress(e.longitude, e.latitude),
              ]}>
              <Marker coordinate={this.state.loc} />
            </NaverMapView>
            <View style={[styles.container, {height: '20%'}]}>
              <View style={{width: '65%'}}>
                <TextInput
                  value={this.state.title}
                  onChangeText={(value) => this.onChangeInput(value)}
                  style={[styles.titleText, {backgroundColor: 'white'}]}
                  autoCapitalize={'none'}
                  placeholder="제목을 입력하세요. "
                />
                <Picker
                  selectedValue={this.state.category}
                  style={{width: 250, height: 30}}
                  onValueChange={(value, idx) =>
                    this.setState({category: value})
                  }
                  itemStyle={{fontSize: 12}}>
                  <Picker.Item label="선택해주세요." value="" enabled={false} />
                  <Picker.Item label="운동" value="excercise" />
                  <Picker.Item label="거래" value="date" />
                  <Picker.Item label="이성" value="business" />
                  <Picker.Item label="식사" value="eat" />
                </Picker>
                {this.state.loc.latitude !== 0 ? (
                  <Text style={styles.defText}>{this.state.address}</Text>
                ) : (
                  <Text style={styles.defText}>지도에 마커를 찍어주세요.</Text>
                )}
              </View>
              <TouchableOpacity
                style={[styles.button, {marginLeft: 15}]}
                onPress={() => this.modeChange()}>
                <Text>취소</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.button}
                onPress={() => this.createRoom()}>
                <Text>완성</Text>
              </TouchableOpacity>
            </View>
          </View>
        )}
      </View>
    );
  }
}

const styles = StyleSheet.create({
  container: {
    height: '15%',
    width: '100%',
    flexDirection: 'row',
    alignItems: 'center',
    // justifyContent: 'space-between',
    marginLeft: 5,
  },
  defText: {
    padding: 3,
    paddingLeft: 10,
    color: 'gray',
  },
  titleText: {
    fontSize: 20,
    fontWeight: 'bold',
    paddingLeft: 10,
    padding: 2,
  },
  button: {
    backgroundColor: 'skyblue',
    borderRadius: 15,
    padding: 12,
    marginRight: 15,
  },
  searchButton: {
    backgroundColor: 'white',
    position: 'absolute',
    right: 20,
    top: 20,
    width: '90%',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderWidth: 1,
    borderRadius: 5,
    padding: 2,
  },
});

export default MapComponent;
