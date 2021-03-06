import * as config from './config';
import React from 'react';
import { getRoomName } from './tool';

class Reservation extends React.Component {
    constructor(props) {
        super(props);
        this.state = {
            date: new Date().toISOString().slice(0, 10),
            rooms: null,
            reservations: null,
            role: "",
            isLoading: false,
            isChanged: true,
            isCheckLogin: true,
            isRoomLoaded: false,
        };

        this.startTimeHour = 9;
        this.handleChange = this.handleChange.bind(this);
        this.showReservation = this.showReservation.bind(this);
        this.showNewReservation = this.showNewReservation.bind(this);
        this.newReservation = this.newReservation.bind(this);
    }

    getRoomList() {
        this.setState({ isRoomLoaded: true });
        fetch(`${config.SERVER_URL}/room/`, { method: "GET" })
            .then(res => res.json())
            .then(res => {
                this.setState({
                    rooms: res.rooms
                });
            })
            .catch(e => {
                console.log(e);
            });
    }

    getReservationOfDate() {
        if (this.state.isLoading)
            return;

        let date = this.state.date;

        fetch(`${config.SERVER_URL}/reservation/?date=${date}`, {
            method: "GET",
            credentials: 'include'
        })
            .then(res => res.json())
            .then(res => {
                this.setState({
                    reservations: res.reservations,
                    isLoading: false,
                    isChanged: false
                });
            })
            .catch(e => {
                console.log(e);
            });
        this.setState({
            isLoading: true
        });
    }

    generateRoomList() {
        let room = this.state.rooms;
        let roomList = [];
        for (let i of room) {
            if (i.is_available) {
                roomList.push(<th key={i._id} className="align-middle" scope="col"> {i.name} </th>)
            }
        }
        return roomList;
    }

    generateTimeList() {
        let timeList = [];
        for (let i = 0; i < 14; i++) {
            let status = [];
            for (let j = 0; j < this.state.rooms.length; j++) {
                let find = false;
                this.state.reservations.forEach((ele, idx) => {
                    const start = new Date(ele.start);
                    const end = new Date(ele.end);
                    if ((i + this.startTimeHour) >= start.getHours() && (i + this.startTimeHour) < end.getHours() && ele.room_id === this.state.rooms[j]._id) {
                        status.push(<td key={`${i}-${j}`} className="table-active align-middle">
                            <button className="btn btn-link btn-sm" data-toggle="modal" data-target="#reservationDetail" data-reservation={idx} onClick={this.showReservation}>{ele.topic}</button>
                        </td>);
                        find = true;
                        return;
                    }
                });

                if (!find) {
                    let cell;
                    if (this.state.role !== "") {
                        cell = <td className="align-middle" key={`${i}-${j}`}>
                            尚無預約<br />
                            <button className="btn btn-outline-success btn-sm" data-toggle="modal" data-target="#newReservation" onClick={this.showNewReservation} data-room={`${i}-${j}`}>預約</button>
                        </td>;
                    } else {
                        cell = <td className="align-middle" key={`${i}-${j}`}>
                            尚無預約
                        </td>;
                    }
                    status.push(cell);
                }
            }

            timeList.push(<tr key={i}>
                <th className="align-middle" scope="row"> {(i + this.startTimeHour).toString().padStart(2, '0') + ":00"} </th>
                {status}
            </tr>);
        }
        return timeList;
    }

    showReservation(event) {
        const idx = parseInt(event.target.dataset.reservation);
        const reservation = this.state.reservations[idx];

        const spans = document.querySelectorAll('#reservationDetail > div > div > div:nth-child(2) > div span');
        spans[0].innerHTML = reservation.host_name;
        spans[1].innerHTML = getRoomName(reservation.room_id, this.state.rooms);
        spans[2].innerHTML = reservation.detail;
        spans[3].innerHTML = `${reservation.start.slice(0, 19)} ~ ${reservation.end.slice(0, 19)}`;

        const header = document.querySelector('#reservationDetail > div > div > div:nth-child(1) > h5 > span')
        header.innerHTML = reservation.topic;

        document.querySelector('#join').dataset._id = this.state.reservations[idx]._id;
    }

    showNewReservation(event) {
        const idx = event.target.dataset.room.split('-');
        const time = (this.startTimeHour + parseInt(idx[0])).toString().padStart(2, '0');
        const room = this.state.rooms[idx[1]];

        this.generateTimeOption(idx);

        document.querySelector('#start').value = `${document.querySelector('#date').value} ${time}:00`;
        document.querySelector('#room').value = room.name;
    }

    generateTimeOption(idx) {
        const maxTime = this.getMaxTime(idx);

        document.querySelector('#time').innerHTML = "";
        for (let i = 1; i <= maxTime; i++) {
            let newOption = document.createElement("option");
            newOption.value = i;
            newOption.innerHTML = `${i} 小時`;
            document.querySelector('#time').appendChild(newOption);
        }
    }

    getMaxTime(idx) {
        let counter = 1;
        for (let i = 1; i <= 2; i++) {
            const nextTime = document.querySelector(`[data-room="${parseInt(idx[0]) + i}-${idx[1]}"]`);
            if (nextTime) {
                counter++;
            }
        }
        return counter;
    }

    handleChange(event) {
        event.preventDefault();
        this.setState({ date: document.querySelector('#date').value, isChanged: true });
    }

    newReservation() {
        const title = document.querySelector('#title').value;
        const detail = document.querySelector('#detail').value;
        const room = document.querySelector('#room').value;
        const time = document.querySelector('#time').value;
        const start = `${document.querySelector('#start').value}:00`;
        const end = start.substr(0, 11) + (parseInt(start.substr(11, 2)) + parseInt(time)).toString() + start.substr(13);

        let formData = new FormData();

        formData.append('roomname', room);
        formData.append('topic', title);
        formData.append('detail', detail);
        formData.append('start', start);
        formData.append('end', end);

        fetch(`${config.SERVER_URL}/create/`, {
            method: "POST",
            body: formData,
            credentials: 'include'
        })
            .then(res => {
                window.location = '/';
                console.log(res);
            })
            .catch(e => {
                console.log(e);
            });
    }

    join() {
        const reservation_id = document.querySelector('#join').dataset._id;

        let formData = new FormData();
        formData.append('reservation_id', reservation_id);

        fetch(`${config.SERVER_URL}/join/`, {
            method: "POST",
            body: formData,
            credentials: 'include'
        })
            .then(res => {
                window.location = '/myReservation';
            })
            .catch(e => {
                alert('無法加入！');
                console.log(e);
            });
    }

    checkRole() {
        this.setState({ isCheckLogin: false });
        fetch(`${config.SERVER_URL}/login/current/`, {
            method: "GET",
            credentials: 'include'
        })
            .then(res => res.json())
            .then(res => {
                if (!res.status) {
                    this.setState({ role: "" });
                } else {
                    this.setState({ role: res.account.role });
                }
            })
            .catch(e => {
                console.log(e);
            });
    }

    showLoading() {
        return (<div className="d-flex p-5">
            <div className="d-flex w-100 justify-content-center align-self-center">
                <h1>Loading...</h1>
            </div>
        </div>);
    }

    render() {
        if (this.state.role === "" && this.state.isCheckLogin) {
            this.checkRole();
        }
        if (!this.state.isRoomLoaded) {
            this.getRoomList();
        }
        if (this.state.isChanged) {
            this.getReservationOfDate();
        }
        if (this.state.rooms === null || this.state.reservations === null) {
            return this.showLoading();
        }

        const room = this.generateRoomList();
        const time = this.generateTimeList();

        let joinBtn = "";
        if (this.state.role !== "") {
            joinBtn = <button type="button" className="btn btn-primary" id="join" onClick={this.join}>Join</button>;
        }

        return (
            <div className="container p-4">
                <form className="form-inline align-items-center">
                    <input className="m-3 form-control" id="date" type="date" defaultValue={this.state.date} />
                    <button className="btn btn-primary m-3" onClick={this.handleChange}>Search</button>
                </form>
                <div className="table-responsive">
                    <table className="table my-2 text-center">
                        <thead>
                            <tr>
                                <th className="align-middle" scope="col">#</th>
                                {room}
                            </tr>
                        </thead>
                        <tbody>
                            {time}
                        </tbody>
                    </table>
                </div>

                <div className="modal fade" id="newReservation" tabIndex="-1" aria-labelledby="reservationLabel" aria-hidden="true">
                    <div className="modal-dialog modal-dialog-centered">
                        <div className="modal-content">
                            <div className="modal-header">
                                <h5 className="modal-title" id="reservationLabel">預約</h5>
                                <button type="button" className="close" data-dismiss="modal" aria-label="Close">
                                    <span aria-hidden="true">&times;</span>
                                </button>
                            </div>
                            <div className="modal-body">
                                <div className="form-group">
                                    <label htmlFor="title">標題</label>
                                    <input type="text" className="form-control" id="title" />
                                </div>
                                <div className="form-group">
                                    <label htmlFor="detail">描述</label>
                                    <input type="text" className="form-control" id="detail" />
                                </div>
                                <div className="form-group">
                                    <label htmlFor="room">會議室</label>
                                    <input type="text" readOnly className="form-control" id="room" />
                                </div>
                                <div className="form-group">
                                    <label htmlFor="start">開始時間</label>
                                    <input type="text" readOnly className="form-control" id="start" />
                                </div>
                                <div className="form-group">
                                    <label htmlFor="time">持續時間</label>
                                    <select className="form-control" id="time"></select>
                                </div>
                            </div>
                            <div className="modal-footer">
                                <button type="button" className="btn btn-primary" onClick={this.newReservation}>Submit</button>
                                <button type="button" className="btn btn-secondary" data-dismiss="modal">Close</button>
                            </div>
                        </div>
                    </div>
                </div>

                <div className="modal fade" id="reservationDetail" tabIndex="-1" aria-labelledby="reservationDetailLabel" aria-hidden="true">
                    <div className="modal-dialog modal-dialog-centered">
                        <div className="modal-content">
                            <div className="modal-header">
                                <h5 className="modal-title" id="reservationDetailLabel">詳細資訊 - <span></span></h5>
                                <button type="button" className="close" data-dismiss="modal" aria-label="Close">
                                    <span aria-hidden="true">&times;</span>
                                </button>
                            </div>
                            <div className="modal-body">
                                <div className="form-group row">
                                    <label className="col-sm-3 col-form-label">主辦人：</label>
                                    <span className="col-sm-10 col-form-label"></span>
                                </div>
                                <div className="form-group row">
                                    <label className="col-sm-3 col-form-label">會議室：</label>
                                    <span className="col-sm-10 col-form-label"></span>
                                </div>
                                <div className="form-group row">
                                    <label className="col-sm-3 col-form-label">描述：</label>
                                    <span className="col-sm-10 col-form-label"></span>
                                </div>
                                <div className="form-group row">
                                    <label className="col-sm-3 col-form-label">時間：</label>
                                    <span className="col-sm-10 col-form-label"></span>
                                </div>
                            </div>
                            <div className="modal-footer">
                                {joinBtn}
                                <button type="button" className="btn btn-secondary" data-dismiss="modal">Close</button>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        );
    }
}

export default Reservation;
