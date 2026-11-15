"""Camera and frame geometry for the rover POV build (imported by pov_build.py).

FRAMES (primary sources, all read for this build)
  [F] MSL Coordinate Frames, PDS MSLNAV_0XXX/DOCUMENT/MSL_COORDINATE_FRAMES.PDF (JPL 2013):
      SITE   origin fixed to Mars on the nominal surface where the site was declared;
             +X North, +Y East, +Z Nadir (down).
      RNAV   rover navigation frame: origin on the nominal surface under the turn-in-place axis;
             +X forward, +Y starboard (right), +Z down through the chassis.
      LL     local level: origin = RNAV origin, axes parallel to SITE (N, E, Nadir).
      Rover position in site N+1 is expressed in site N as (X,Y,Z)_N+1 + S_N,N+1.
  [S] MSL Camera & LIBS EDR/RDR Data Products SIS v4.1, JPL D-38107 (PDS MSL_CAMERA_SIS_latest.PDF)
      p.368 ORIGIN_OFFSET_VECTOR: "the location of the current system's origin as measured in the
             reference system". For ROVER_COORDINATE_SYSTEM the reference is the SITE frame.
      p.369 ORIGIN_ROTATION_QUATERNION: "Given a vector expressed in the current frame,
             multiplication by this quaternion will give the same vector as expressed in the
             reference frame." Ground order (s, v1, v2, v3), s = cos(theta/2). Flight software
             order is (v1, v2, v3, s), so the order of any non-PDS copy has to be checked.
      p.323 INSTRUMENT_AZIMUTH/ELEVATION (ROVER_ or SITE_DERIVED_GEOMETRY_PARMS): "For MSL, the
             interpretation is the boresight of the camera, defined as projecting the center of
             the nominal image ... through the camera model." Azimuth clockwise from +X.
  [L] PDS4 Mastcam labels (msl_mmm bundle, e.g. .../volume_0042_raw/SURFACE/4801/
      4801mr1087660002403790c00_dxxx.xml): geom:Camera_Model_Parameters references
      ROVER_NAV_FRAME (SITE, DRIVE, POSE); ROVER_NAV_FRAME is defined relative to SITE_FRAME
      by Vector_Origin_Offset and Quaternion_Plus_Direction (qcos, qsin1, qsin2, qsin3).
  [C] GEOMETRIC_CM.TXT (PDS MSL document; Yakimovsky & Cunningham 1978 for CAHV; Gennery 2001
      "Least-squares camera calibration including lens distortion..." for CAHVOR; Gennery 2002/
      2006 "Generalized camera calibration including fish-eye lenses" for CAHVORE):
      image (0,0) = centre of the upper-left pixel, x right, y down;
      x = (P-C).H / (P-C).A,  y = (P-C).V / (P-C).A;  A = unit normal to the image plane
      (not the pointing direction); O = radial-distortion symmetry axis; CAHVORE type T and
      linearity P (P = 1 perspective, P = 0 fish-eye).

RAW-IMAGE API FIELDS (mars.nasa.gov/api/v1/raw_image_items, Team MSLICE engineering products).
Established by [S]/[L] above and verified against data in pov_build.py verify:
  camera_model_component_list  C;A;H;V;O;R[;E;T;P]  in RNAV at the image's (site, drive)
  camera_position              = C (RNAV, metres)
  camera_vector                unit ray in RNAV through pixel (W/2, H/2) = (512, 512): matches
                               ray() to 0.00000 deg (Navcam) / 0.00005 deg (Hazcam CAHVORE),
                               i.e. half a pixel off the true centre (511.5, 511.5)
  attitude                     quaternion (s, v1, v2, v3) rotating RNAV vectors into SITE
                               (= ORIGIN_ROTATION_QUATERNION of ROVER_COORDINATE_SYSTEM)
  xyz                          RNAV origin in the SITE frame, metres, (N, E, Down)
                               (= ORIGIN_OFFSET_VECTOR of ROVER_COORDINATE_SYSTEM)
  extended.mast_az / mast_el   INSTRUMENT_AZIMUTH/ELEVATION in RNAV (degrees; az clockwise from
                               forward, el positive up) of the ray through (511.5, 511.5)
Mastcam (MSSS) records in the API carry none of these; their geometry comes from [L].
"""
import math
import numpy as np


def vec(s):
    """'(a,b,c)' -> np.array"""
    return np.array([float(t) for t in s.strip('()').split(',')])


def parse_cmod(s, kind):
    parts = s.split(';')
    m = {k: vec(parts[i]) for i, k in enumerate('CAHVOR') if i < len(parts) and parts[i].startswith('(')}
    if kind == 'CAHVORE':
        m['E'] = vec(parts[6])
        m['T'] = float(parts[7])
        m['P'] = float(parts[8])
    m['kind'] = kind
    return m


def quat_to_R(q):
    """(s, v1, v2, v3) -> 3x3 rotation matrix R so that v_ref = R @ v_cur."""
    s, x, y, z = np.asarray(q, float) / np.linalg.norm(q)
    return np.array([
        [1 - 2 * (y * y + z * z), 2 * (x * y - s * z), 2 * (x * z + s * y)],
        [2 * (x * y + s * z), 1 - 2 * (x * x + z * z), 2 * (y * z - s * x)],
        [2 * (x * z - s * y), 2 * (y * z + s * x), 1 - 2 * (x * x + y * y)]])


def ypr_from_R(R):
    """Yaw (heading of +X from North, clockwise), pitch (nose up +), roll (right side down +),
    for an RNAV->SITE rotation, degrees. Z-Y-X Euler order, Z down."""
    yaw = math.degrees(math.atan2(R[1, 0], R[0, 0]))
    pitch = math.degrees(math.asin(max(-1.0, min(1.0, -R[2, 0]))))
    roll = math.degrees(math.atan2(R[2, 1], R[2, 2]))
    return yaw, pitch, roll


def az_el(d):
    """Azimuth (clockwise from +X toward +Y) and elevation (up +) of a vector in a Z-down frame."""
    d = d / np.linalg.norm(d)
    return math.degrees(math.atan2(d[1], d[0])), math.degrees(math.asin(max(-1.0, min(1.0, -d[2]))))


def wrap(a):
    return (a + 180.0) % 360.0 - 180.0


def ray(m, x, y):
    """Unit direction of the ray through image point (x, y), same frame as the model.
    CAHV linear ray, then the radial term removed by Newton iteration, as in the JPL cmod
    2d_to_3d routines. CAHVOR is the CAHVORE case with linearity 1. For CAHVORE the moving
    entrance pupil (E terms) only shifts the ray origin by millimetres, so it is ignored here
    (directions only)."""
    A, H, V = m['A'], m['H'], m['V']
    f = V - y * A
    g = H - x * A
    rr = np.cross(f, g)
    rr /= np.linalg.norm(rr)
    if np.dot(np.cross(V, H), A) < 0:
        rr = -rr
    if 'O' not in m:
        return rr
    O, Rr = m['O'], m['R']
    if m['kind'] == 'CAHVORE':
        T, P = m['T'], m['P']
        L = 1.0 if T == 1 else (0.0 if T == 2 else P)
    else:
        L = 1.0
    om = np.dot(rr, O)
    lam = rr - om * O
    ll = np.linalg.norm(lam)
    if ll < 1e-12:
        return O.copy()
    chip = ll / om if om > 1e-9 else 1e9
    chi = chip
    for _ in range(100):
        c2 = chi * chi
        fval = (1 + Rr[0]) * chi + Rr[1] * chi * c2 + Rr[2] * chi * c2 * c2 - chip
        der = (1 + Rr[0]) + 3 * Rr[1] * c2 + 5 * Rr[2] * c2 * c2
        d = fval / der
        chi -= d
        if abs(d) < 1e-12:
            break
    if L > 1e-8:
        th = math.atan(L * chi) / L
    elif L < -1e-8:
        th = math.asin(max(-1.0, min(1.0, L * chi))) / L
    else:
        th = chi
    u = lam / ll
    out = math.cos(th) * O + math.sin(th) * u
    return out / np.linalg.norm(out)


def angle(a, b):
    return math.degrees(math.acos(max(-1.0, min(1.0, float(np.dot(a, b))))))


def view(m, W, H):
    """Boresight, image-up vector, horizontal/vertical FOV (deg) and corner rays of a W x H
    image, all in the camera model's frame. Pixel (0,0) is the centre of the upper-left pixel,
    so the image spans -0.5 .. W-0.5."""
    xc, yc = (W - 1) / 2.0, (H - 1) / 2.0
    look = ray(m, xc, yc)
    e = 0.02 * H
    up = ray(m, xc, yc - e) - ray(m, xc, yc + e)
    up -= np.dot(up, look) * look
    up /= np.linalg.norm(up)
    hfov = angle(ray(m, -0.5, yc), ray(m, W - 0.5, yc))
    vfov = angle(ray(m, xc, -0.5), ray(m, xc, H - 0.5))
    corners = [ray(m, -0.5, -0.5), ray(m, W - 0.5, -0.5), ray(m, W - 0.5, H - 0.5), ray(m, -0.5, H - 0.5)]
    return look, up, hfov, vfov, corners


def project(m, P):
    """3D point -> image (x, y) for CAHVOR (used only for self-tests)."""
    d = P - m['C']
    if 'O' in m:
        om = np.dot(d, m['O'])
        lam = d - om * m['O']
        tau = np.dot(lam, lam) / (om * om)
        mu = m['R'][0] + m['R'][1] * tau + m['R'][2] * tau * tau
        d = d + mu * lam
    return np.dot(d, m['H']) / np.dot(d, m['A']), np.dot(d, m['V']) / np.dot(d, m['A'])


# SITE (N, E, Down) <-> app world (X east, Y up, Z = -north) ---------------------------------
def ned_to_app_dir(v, k=1.0):
    """Site-frame (N, E, Down) direction -> app direction (X east, Y up, Z = -north).
    k = 1/cos(lat) stretches east-west like the equirectangular map does, so a ray drawn in the
    app world (map metres) hits the same terrain point as the true ray (effect <= 0.1 deg)."""
    n, e, d = v
    out = np.array([k * e, -d, -n])
    return out / np.linalg.norm(out)
